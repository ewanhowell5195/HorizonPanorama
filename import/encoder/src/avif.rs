use rav1e::prelude::*;
use rayon::prelude::*;

const KR: f32 = 0.299;
const KB: f32 = 0.114;

pub struct Options {
  pub quality: f32,
  pub speed: u8,
  pub depth: u8,
}

fn quantizer(quality: f32) -> usize {
  let q = quality / 100.0;
  let x = if q >= 0.82 { (1.0 - q) * 2.6 } else if q > 0.25 { 1.0 - 0.125 - q * 0.5 } else { 1.0 - q };
  (x * 255.0).round() as usize
}

fn speed_settings(options: &Options) -> SpeedSettings {
  let speed = options.speed;
  let mut settings = SpeedSettings::from_preset(speed);
  settings.multiref = false;
  settings.rdo_lookahead_frames = 1;
  settings.scene_detection_mode = SceneDetectionSpeed::None;
  settings.motion.include_near_mvs = false;
  settings.motion.use_satd_subpel = false;
  let (min, max) = match speed {
    0..=4 => (BlockSize::BLOCK_4X4, BlockSize::BLOCK_16X16),
    5..=8 => (BlockSize::BLOCK_8X8, BlockSize::BLOCK_16X16),
    _ => (BlockSize::BLOCK_16X16, BlockSize::BLOCK_16X16),
  };
  settings.partition.partition_range = PartitionRange::new(min, max);
  settings.partition.encode_bottomup = speed <= 2;
  settings.prediction.prediction_modes = if speed <= 1 { PredictionModesSetting::ComplexAll } else { PredictionModesSetting::Simple };
  settings.prediction.fine_directional_intra = speed <= 6;
  settings.sgr_complexity = if speed <= 2 { SGRComplexityLevel::Full } else { SGRComplexityLevel::Reduced };
  settings.transform.rdo_tx_decision = false;
  settings.transform.reduced_tx_set = speed == 4 || speed >= 9;
  settings.transform.enable_inter_tx_split = speed >= 9;
  settings.transform.tx_domain_rate = speed >= 10;
  // rav1e runs the deblock level search, CDEF and loop restoration over the whole frame on one thread
  settings.fast_deblock = true;
  settings.cdef = false;
  settings.lrf = false;
  settings
}

pub fn encode(rgb: Vec<u16>, width: usize, height: usize, options: &Options) -> Result<Vec<u8>, String> {
  let depth = options.depth as usize;
  let quantizer = quantizer(options.quality);
  let config = Config::new().with_encoder_config(EncoderConfig {
    width,
    height,
    bit_depth: depth,
    chroma_sampling: ChromaSampling::Cs444,
    pixel_range: PixelRange::Full,
    color_description: Some(ColorDescription {
      color_primaries: ColorPrimaries::BT709,
      transfer_characteristics: TransferCharacteristics::SRGB,
      matrix_coefficients: MatrixCoefficients::BT601,
    }),
    still_picture: true,
    quantizer,
    min_quantizer: quantizer as u8,
    tiles: rayon::current_num_threads(),
    speed_settings: speed_settings(options),
    ..Default::default()
  });
  let av1 = if depth == 8 { encode_frame::<u8>(&config, rgb, width, height, depth) } else { encode_frame::<u16>(&config, rgb, width, height, depth) }?;
  let mut avif = avif_serialize::Aviffy::new();
  avif.set_bit_depth(options.depth);
  Ok(avif.to_vec(&av1, None, width as u32, height as u32, options.depth))
}

fn encode_frame<P: Pixel>(config: &Config, rgb: Vec<u16>, width: usize, height: usize, depth: usize) -> Result<Vec<u8>, String> {
  let mut context: Context<P> = config.new_context().map_err(|error| error.to_string())?;
  let mut frame = context.new_frame();
  let max = ((1 << depth) - 1) as f32;
  let shift = (1 << (depth - 1)) as f32;
  for (plane_index, plane) in frame.planes.iter_mut().enumerate() {
    let stride = plane.cfg.stride;
    plane.data_origin_mut().par_chunks_mut(stride).take(height).enumerate().for_each(|(y, row)| {
      let source = &rgb[y * width * 3..(y + 1) * width * 3];
      for (x, out) in row[..width].iter_mut().enumerate() {
        let r = source[x * 3] as f32 / 65535.0;
        let g = source[x * 3 + 1] as f32 / 65535.0;
        let b = source[x * 3 + 2] as f32 / 65535.0;
        let luma = KR * r + (1.0 - KR - KB) * g + KB * b;
        let value = match plane_index {
          0 => luma * max,
          1 => (b - luma) * 0.5 / (1.0 - KB) * max + shift,
          _ => (r - luma) * 0.5 / (1.0 - KR) * max + shift,
        };
        *out = P::cast_from(value.round().clamp(0.0, max) as u16);
      }
    });
  }
  drop(rgb);
  context.send_frame(frame).map_err(|error| error.to_string())?;
  context.flush();
  let mut out = Vec::new();
  loop {
    match context.receive_packet() {
      Ok(mut packet) => out.append(&mut packet.data),
      Err(EncoderStatus::Encoded) => continue,
      Err(EncoderStatus::LimitReached) => break,
      Err(error) => return Err(error.to_string()),
    }
  }
  Ok(out)
}
