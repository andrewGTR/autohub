const str = `| Option | Description |

| --- | --- |

| Canva | Create charts and tables for presentations and reports |

| Table Generator | Design and customize tables with a graphical editor |

| Flourish | Create interactive tables for free, searchable, sortable, and mobile-friendly |

| Adobe Express | Choose a template and input your information with fun designs |`;

console.log(str.replace(/\|\s*[\r\n]+\s*[\r\n]+\s*\|/g, '|\n|'));
