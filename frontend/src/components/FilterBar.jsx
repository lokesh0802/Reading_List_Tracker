const LABELS = {
  all: "All",
  to_read: "To Read",
  reading: "Reading",
  done: "Done",
};

export default function FilterBar({ filters, active, onChange }) {
  return (
    <nav className="filter-bar">
      {filters.map((filter) => (
        <button
          key={filter}
          className={filter === active ? "filter active" : "filter"}
          onClick={() => onChange(filter)}
        >
          {LABELS[filter] || filter}
        </button>
      ))}
    </nav>
  );
}
