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

module.exports = { generateTrendingChart };
