import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import styles from './PositionsPanel.module.scss';
import type { SectorAllocationSlice } from './sectorAllocations';

interface DonutChartProps {
  sectors: SectorAllocationSlice[];
}

export function DonutChart({ sectors }: DonutChartProps) {
  const cx = 90;
  const cy = 90;
  const radius = 72;
  const innerRadius = 48;
  const ringRadius = (radius + innerRadius) / 2;
  const ringWidth = radius - innerRadius;

  const chartSectors = sectors.filter((sector) => sector.percentage > 0);

  // SVG arc cannot represent a full 360° path (start = end → degenerate).
  const isSingleFullSector = chartSectors.length === 1;

  if (isSingleFullSector) {
    return (
      <div className={styles.allocationCard}>
        <p className={styles.allocationTitle}>SECTOR ALLOCATION</p>
        <div className={styles.allocationBody}>
          <svg width={180} height={180} viewBox="0 0 180 180" className={styles.donutSvg}>
            <circle
              className={styles.donutRing}
              cx={cx}
              cy={cy}
              r={ringRadius}
              strokeWidth={ringWidth}
              style={toCssCustomProperties({ '--swatch-color': chartSectors[0].color })}
            />
          </svg>
          <ul className={styles.allocationLegend}>
            {sectors.map((sector) => (
              <li key={sector.sector} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={toCssCustomProperties({ '--swatch-color': sector.color })}
                />
                <span className={styles.legendLabel}>{sector.sector}</span>
                <span className={styles.legendValue}>{sector.displayPercentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const slices = chartSectors.reduce<Array<SectorAllocationSlice & { path: string }>>(
    (acc, sector) => {
      const startPercent = acc.reduce((sum, slice) => sum + slice.percentage, 0);
      const endPercent = startPercent + sector.percentage;

      const startAngle = (startPercent / 100) * 360 - 90;
      const endAngle = (endPercent / 100) * 360 - 90;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const ix1 = cx + innerRadius * Math.cos(startRad);
      const iy1 = cy + innerRadius * Math.sin(startRad);
      const ix2 = cx + innerRadius * Math.cos(endRad);
      const iy2 = cy + innerRadius * Math.sin(endRad);

      const largeArc = sector.percentage > 50 ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z',
      ].join(' ');

      return [...acc, { ...sector, path }];
    },
    []
  );

  return (
    <div className={styles.allocationCard}>
      <p className={styles.allocationTitle}>SECTOR ALLOCATION</p>
      <div className={styles.allocationBody}>
        <svg width={180} height={180} viewBox="0 0 180 180" className={styles.donutSvg}>
          {slices.map((slice) => (
            <path
              key={slice.sector}
              className={styles.donutSlice}
              d={slice.path}
              style={toCssCustomProperties({ '--swatch-color': slice.color })}
            />
          ))}
        </svg>
        <ul className={styles.allocationLegend}>
          {sectors.map((sector) => (
            <li key={sector.sector} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={toCssCustomProperties({ '--swatch-color': sector.color })}
              />
              <span className={styles.legendLabel}>{sector.sector}</span>
              <span className={styles.legendValue}>{sector.displayPercentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
