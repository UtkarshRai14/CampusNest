













function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function toDataUri(svg) {
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function generateTrendingChart(categories, counts) {
  const width = 760;
  const height = 380;
  const marginLeft = 60;
  const marginRight = 20;
  const marginTop = 50;
  const marginBottom = 100;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const maxCount = Math.max(...counts, 1);
  const barGap = 12;
  const barWidth = Math.max((plotWidth - barGap * (categories.length - 1)) / categories.length, 8);

  let bars = '';
  categories.forEach((cat, i) => {
    const x = marginLeft + i * (barWidth + barGap);
    const barHeight = (counts[i] / maxCount) * plotHeight;
    const y = marginTop + (plotHeight - barHeight);
    const color = i === 0 ? '#00C896' : '#0A4D68';
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${color}" />`;
    bars += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="12" fill="#333" text-anchor="middle">${counts[i]}</text>`;
    const labelX = x + barWidth / 2;
    const labelY = marginTop + plotHeight + 14;
    bars += `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="11" fill="#555" text-anchor="end" transform="rotate(-30 ${labelX.toFixed(1)} ${labelY.toFixed(1)})">${escapeXml(cat)}</text>`;
  });

  return toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F8FFFE" />
  <text x="${width / 2}" y="26" font-size="16" font-weight="bold" fill="#0A1628" text-anchor="middle">Trending Categories on CampusNest</text>
  <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${marginLeft + plotWidth}" y2="${marginTop + plotHeight}" stroke="#999" stroke-width="1" />
  <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotHeight}" stroke="#999" stroke-width="1" />
  <text x="${marginLeft - 45}" y="${marginTop + plotHeight / 2}" font-size="10" fill="#555" text-anchor="middle" transform="rotate(-90 ${marginLeft - 45} ${marginTop + plotHeight / 2})">Number of Listings</text>
  <text x="${marginLeft + plotWidth / 2}" y="${height - 6}" font-size="10" fill="#555" text-anchor="middle">Category</text>
  ${bars}
</svg>`.trim());
}


function generateDemandChart(departments, counts) {
  const width = 760;
  const height = Math.max(260, 60 + departments.length * 40);
  const marginLeft = 220;
  const marginRight = 40;
  const marginTop = 50;
  const marginBottom = 40;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const maxCount = Math.max(...counts, 1);
  const barGap = 10;
  const barHeight = Math.max((plotHeight - barGap * (departments.length - 1)) / departments.length, 10);

  let bars = '';
  departments.forEach((dept, i) => {
    const y = marginTop + i * (barHeight + barGap);
    const w = (counts[i] / maxCount) * plotWidth;
    
    const shade = 30 + Math.round((i / Math.max(departments.length - 1, 1)) * 50);
    const color = `hsl(210, 60%, ${shade}%)`;
    const label = dept.length > 20 ? `${dept.slice(0, 20)}...` : dept;
    bars += `<rect x="${marginLeft}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${color}" />`;
    bars += `<text x="${marginLeft - 10}" y="${(y + barHeight / 2 + 4).toFixed(1)}" font-size="11" fill="#333" text-anchor="end">${escapeXml(label)}</text>`;
    bars += `<text x="${(marginLeft + w + 6).toFixed(1)}" y="${(y + barHeight / 2 + 4).toFixed(1)}" font-size="11" fill="#333">${counts[i]}</text>`;
  });

  return toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#F8FFFE" />
  <text x="${width / 2}" y="26" font-size="16" font-weight="bold" fill="#0A1628" text-anchor="middle">Demand by Department</text>
  <text x="${marginLeft + plotWidth / 2}" y="${height - 8}" font-size="10" fill="#555" text-anchor="middle">Number of Listings</text>
  ${bars}
</svg>`.trim());
}

module.exports = { generateTrendingChart, generateDemandChart };
