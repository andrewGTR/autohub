"use client";

import React from "react";

export default function FiltersToggle() {
  return (
    <div className="filters-btn-wrap">
      <button
        className="filters-btn"
        onClick={() => {
          document.getElementById("sidebar")?.classList.toggle("open");
          document.getElementById("mainWrapper")?.classList.toggle("filters-open");
        }}
      >
        Filters
      </button>
    </div>
  );
}
