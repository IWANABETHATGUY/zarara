#![deny(clippy::all)]

use std::path::PathBuf;

use napi::bindgen_prelude::{BigInt, Error, Result, Status};
use napi_derive::napi;

fn bigint_to_u64(v: BigInt) -> Result<u64> {
    let (sign_bit, value, lossless) = v.get_u64();
    if sign_bit || !lossless {
        return Err(Error::new(
            Status::InvalidArg,
            "seed must be a non-negative integer that fits in u64",
        ));
    }
    Ok(value)
}

#[napi]
pub fn generate_fixture_from_seed(seed: BigInt, output_dir: Option<String>) -> Result<String> {
    let seed = bigint_to_u64(seed)?;
    let dir = acyclic_output_fuzz::generate_fixture_from_seed(seed, output_dir.map(PathBuf::from))
        .map_err(|err| Error::new(Status::GenericFailure, err.to_string()))?;
    Ok(dir.to_string_lossy().into_owned())
}

#[napi]
pub fn generate_fixture_from_case_spec(
    seed: BigInt,
    case_spec: String,
    output_dir: Option<String>,
) -> Result<String> {
    let seed = bigint_to_u64(seed)?;
    let dir = acyclic_output_fuzz::generate_fixture_from_case_spec(
        seed,
        &case_spec,
        output_dir.map(PathBuf::from),
    )
    .map_err(|err| Error::new(Status::GenericFailure, err))?;
    Ok(dir.to_string_lossy().into_owned())
}
