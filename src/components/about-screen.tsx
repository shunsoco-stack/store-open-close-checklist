"use client";
import { useApp } from "./app-provider";
import { seed } from "@/lib/seed";
import { japanNow } from "@/lib/dates";
import { clearPhotos, seedPhoto } from "@/lib/photos";

export function AboutScreen() {
  const { update, notify } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ABOUT THIS DEMO</p>
          <h1>このデモについて</h1>
          <p className="muted">小さなお店の、毎日の安心をつくる。</p>
        </div>
      </div>
      <div className="panel prose">
        <h2>デモ用の架空データです</h2>
        <p>
          青凪店、みなと町店、ほしぞら通り店はすべて架空の店舗です。スタッフ名、実施記録、申し送りも架空で、実在の店舗・企業・個人とは無関係です。
        </p>
        <p>
          初回の日時は、このアプリを開いた日本時間を基準に生成します。添付サンプルはアプリ内で描いた「サンプル画像（架空）」です。
        </p>
        <h2>この端末だけに保存</h2>
        <p>
          チェック・設定・申し送りは localStorage（occ:v1）、写真は
          IndexedDB（occ-photos）に保存します。認証・外部API・外部へのデータ送信はありません。端末間の同期やバックアップは行いません。
        </p>
        <p>
          ブラウザのデータを消すと記録も失われます。必要な記録はCSVや印刷で保存してください。写真は長辺1200px以下に縮小し、1項目につき2枚まで保存できます。
        </p>
        <h2>営業日とオフライン</h2>
        <p>
          営業日の切り替えは店舗ごとに設定でき、既定は05:00です。
          00:00〜04:59は前日の営業日として表示します。
          深夜01:00に閉店する店舗の閉店チェックも、前日の営業日に記録されます。
        </p>
        <p>
          本番環境では、開いたページを端末にキャッシュします。
          インストール対応ブラウザのメニューからホーム画面に追加できます。
          一度も開いていない画面は、オフラインでは利用できない場合があります。
        </p>
        <h2>このアプリの範囲</h2>
        <p>
          毎日の定型チェック、誰がいつ確認したかの記録、次の担当者への申し送りに集中しています。修理管理、設備台帳、在庫数、レジ金額、勤怠・予約、法定期限、メール・プッシュ通知は扱いません。
        </p>
      </div>
      <section className="panel form-stack">
        <h2>デモデータの管理</h2>
        <div>
          <button
            className="button secondary"
            onClick={async () => {
              if (!window.confirm("この端末に保存したすべての写真を削除しますか？")) return;
              try {
                await clearPhotos();
                update((d) => ({
                  ...d,
                  checks: d.checks.map((c) => ({
                    ...c,
                    items: c.items.map((i) => ({ ...i, photos: [] })),
                  })),
                }));
                notify("写真を削除しました。確認記録と申し送りは残しています。");
              } catch (error) {
                notify(String(error));
              }
            }}
          >
            保存した写真をすべて削除
          </button>
          <p className="small muted">完了済み記録の添付写真も削除されます。</p>
        </div>
        <div>
          <button
            className="button danger-button"
            onClick={async () => {
              if (
                !window.confirm(
                  "すべての記録・設定・写真を削除して、現在日時の既定データに戻しますか？",
                )
              )
                return;
              try {
                await clearPhotos();
                await seedPhoto();
                update(() => seed(japanNow()));
                notify("現在の日本時間を基準に、既定データを作り直しました。");
              } catch (error) {
                notify(String(error));
              }
            }}
          >
            既定データに戻す
          </button>
          <p className="small muted">
            変更したテンプレートやスタッフも初期化されます。この操作は取り消せません。
          </p>
        </div>
      </section>
    </>
  );
}
