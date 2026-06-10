export async function generateChecksum(
  userId: string | null,
  body: string
): Promise<string> {
  const keyStr = "b^[VCHDL786mkTp]*" + (userId || "");
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyStr);
      const cryptoKey = await crypto.subtle.importKey(
        'raw', 
        keyData, 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(body)
      );
      
      const hashArray = Array.from(new Uint8Array(signature));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch(e) {
      console.warn("Crypto HMAC failed", e);
    }
  }
  
  return "";
}
