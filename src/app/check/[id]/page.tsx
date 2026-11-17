import { CheckScreen } from "@/components/check-screen";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CheckScreen id={id} />;
}
