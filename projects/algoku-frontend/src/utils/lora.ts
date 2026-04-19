export function loraTxUrl(network: string, txId: string): string {
  return `https://lora.algokit.io/${network}/transaction/${txId}`
}

export function loraAssetUrl(network: string, assetId: bigint | number): string {
  return `https://lora.algokit.io/${network}/asset/${assetId.toString()}`
}
