function jsonDataUrl(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:application/json;base64,${btoa(binary)}`;
}

export function jsonDownloadUrl(json: string, userAgent = navigator.userAgent): string {
  const version = /Version\/(\d+)\.(\d+)/.exec(userAgent);
  if (version && (Number(version[1]) < 18 || (Number(version[1]) === 18 && Number(version[2]) < 1))) return jsonDataUrl(json);
  return URL.createObjectURL(new Blob([json], { type: 'application/json' }));
}
