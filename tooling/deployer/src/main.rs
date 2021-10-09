
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let resp = reqwest::get("https://httpbin.org/ip")
        .await?
        .text()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}