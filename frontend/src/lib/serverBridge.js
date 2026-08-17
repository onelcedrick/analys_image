export async function serverTransfer(targetData, paletteData, params) {
  const response = await fetch('http://localhost:8000/api/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: Array.from(targetData.data),
      width: targetData.width,
      height: targetData.height,
      palette: Array.from(paletteData.data),
      params
    })
  });
  if (!response.ok) throw new Error('Server transfer failed');
  return await response.json();
}

export async function serverTexture(targetData, params) {
  const response = await fetch('http://localhost:8000/api/texture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: Array.from(targetData.data),
      width: targetData.width,
      height: targetData.height,
      params
    })
  });
  if (!response.ok) throw new Error('Server texture failed');
  return await response.json();
}

export async function serverForensic(targetData) {
  const response = await fetch('http://localhost:8000/api/forensic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: Array.from(targetData.data),
      width: targetData.width,
      height: targetData.height
    })
  });
  if (!response.ok) throw new Error('Server forensic failed');
  return await response.json();
}
