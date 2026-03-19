import WorkerCard from "./WorkerCard";
import Icon from "./Icon";

export default function WorkerList({ workers, categories, loading, showBook = false }) {
  const getCat = (id) => categories.find(c => c.id === id);

  if (loading) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
      <div style={{ fontSize:36, marginBottom:12, animation:"pulse 1.5s infinite" }}>⏳</div>
      <p style={{ fontFamily:"'Sora',sans-serif", fontWeight:600 }}>Loading workers…</p>
    </div>
  );

  if (!workers.length) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
      <h3 style={{ fontWeight:700, marginBottom:6, color:"var(--text)" }}>No workers found</h3>
      <p style={{ fontSize:14 }}>Try adjusting your filters</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize:13, color:"var(--muted)", marginBottom:14, fontWeight:500 }}>
        <Icon name="users" size={14} color="var(--muted)" style={{ verticalAlign:"middle" }} />
        {" "}{workers.length} worker{workers.length !== 1 ? "s" : ""} found
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))", gap:18 }}>
        {workers.map(w => (
          <WorkerCard key={w.id} worker={w} category={getCat(w.categoryId)} showBook={showBook} />
        ))}
      </div>
    </div>
  );
}
