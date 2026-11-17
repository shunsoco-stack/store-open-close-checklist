function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("occ-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("写真の保存先を開けませんでした。"));
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const request = action(tx.objectStore("photos"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      db.close();
      reject(new Error("写真を保存できませんでした。端末の空き容量を確認してください。"));
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("写真の処理が中断されました。"));
    };
  });
}
export const getPhoto = (id: string) =>
  operation<Blob | undefined>("readonly", (store) => store.get(id));
export const clearPhotos = () => operation("readwrite", (store) => store.clear());
export const deletePhoto = (id: string) => operation("readwrite", (store) => store.delete(id));
export async function savePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選んでください。");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画像を変換できません。"))),
      "image/jpeg",
      0.8,
    ),
  );
  const id = crypto.randomUUID();
  await operation("readwrite", (store) => store.put(blob, id));
  return id;
}
export async function seedPhoto(): Promise<void> {
  if (await getPhoto("sample-fridge")) return;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
      <rect width="600" height="400" fill="#e8eee9"/>
      <rect x="215" y="45" width="170" height="255" rx="18"
        fill="#fff" stroke="#658773" stroke-width="5"/>
      <path d="M215 125h170M240 75v25M240 155v50" stroke="#658773" stroke-width="6"/>
      <rect x="275" y="160" width="70" height="40" rx="5" fill="#f4d9a8"/>
      <text x="310" y="188" text-anchor="middle" font-size="24">8℃</text>
      <text x="300" y="355" text-anchor="middle" font-size="25" fill="#294e3b">
        サンプル画像（架空）
      </text>
    </svg>`;
  await operation("readwrite", (store) =>
    store.put(new Blob([svg], { type: "image/svg+xml" }), "sample-fridge"),
  );
}
