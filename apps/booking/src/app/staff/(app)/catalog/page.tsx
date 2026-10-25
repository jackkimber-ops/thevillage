import { PackTypeForm, SessionTypeForm } from "@/components/staff/CatalogForms";
import { staffApi } from "@/lib/data";
import { requireManager } from "@/lib/staff-guard";

// S7 Catalog (managers): class types with their drop-in prices, and the packs on sale.
export default async function Catalog() {
  await requireManager();
  const api = staffApi();
  const [types, packs] = await Promise.all([api.sessionTypes(), api.packTypes()]);
  return (
    <>
      <h1 className="heading">catalog</h1>
      <p className="muted" style={{ margin: 0 }}>Prices live here, never in the app&apos;s code. Changing a price applies to new sales only.</p>
      <div className="grid-2">
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="heading sec">packs</h2>
          {packs.map((p) => <PackTypeForm key={p.id} pack={p} types={types} />)}
          <details><summary className="sbtn2" style={{ display: "inline-flex", listStyle: "none" }}>+ New pack</summary><div style={{ marginTop: 12 }}><PackTypeForm pack={null} types={types} /></div></details>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="heading sec">class types</h2>
          {types.filter((t) => t.kind !== "workshop").map((t) => <SessionTypeForm key={t.id} type={t} />)}
          <details><summary className="sbtn2" style={{ display: "inline-flex", listStyle: "none" }}>+ New class type</summary><div style={{ marginTop: 12 }}><SessionTypeForm type={null} /></div></details>
        </section>
      </div>
    </>
  );
}
