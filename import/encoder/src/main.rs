mod avif;

use std::io::Read;
use std::process::ExitCode;

const USAGE: &str = "encoder <quality> <depth> <out.avif> < rgb48le equirectangular panorama (2:1) on stdin";

fn run() -> Result<(), String> {
  let args: Vec<String> = std::env::args().skip(1).collect();
  let [quality, depth, out] = args.as_slice() else { return Err(USAGE.into()) };
  let quality: f32 = quality.parse().map_err(|_| USAGE.to_string())?;
  let depth: u8 = depth.parse().map_err(|_| USAGE.to_string())?;
  let mut bytes = Vec::new();
  std::io::stdin().read_to_end(&mut bytes).map_err(|error| error.to_string())?;
  let height = ((bytes.len() / 12) as f64).sqrt() as usize;
  let width = height * 2;
  if height == 0 || width * height * 6 != bytes.len() {
    return Err(format!("stdin is {} bytes, not a 2:1 rgb48le image", bytes.len()));
  }
  let rgb: Vec<u16> = bytes.chunks_exact(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).collect();
  drop(bytes);
  let avif = avif::encode(rgb, width, height, &avif::Options { quality, speed: 8, depth })?;
  std::fs::write(out, avif).map_err(|error| error.to_string())
}

fn main() -> ExitCode {
  match run() {
    Ok(()) => ExitCode::SUCCESS,
    Err(error) => {
      eprintln!("{error}");
      ExitCode::FAILURE
    }
  }
}
