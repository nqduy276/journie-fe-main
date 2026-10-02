import { C, INK } from './palette'
import { Boat, Cloud, Ink, Karst, Palm, Pine, Window } from './parts'

/* Landscapes and nature. Local origin: ground centre. */

export function BoatKarst({ rice = false, egrets = false }: { rice?: boolean; egrets?: boolean }) {
  return (
    <Ink>
      <Karst x={-72} y={0} w={74} h={88} />
      <Karst x={62} y={0} w={86} h={104} fill={C.stone} shade={C.stoneD} />
      <Karst x={-14} y={0} w={44} h={56} />
      {rice && (
        <g>
          <path d="M-100 0Q-60 -12 -20 -4T100 -6V8H-100Z" fill={C.gold} />
          {[-80, -50, -20, 10, 40, 70].map((x) => (
            <path key={x} d={`M${x} 4Q${x + 8} -6 ${x + 14} 4`} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
          ))}
        </g>
      )}
      <Boat x={4} y={rice ? 8 : 10} w={88} />
      {egrets &&
        [
          [-30, -84],
          [-8, -102],
          [24, -92],
          [48, -112],
        ].map(([x, y]) => (
          <path key={x} d={`M${x - 8} ${y + 3}Q${x - 3} ${y - 5} ${x} ${y}Q${x + 3} ${y - 5} ${x + 8} ${y + 3}`} fill="none" strokeWidth="2.2" stroke={C.white} />
        ))}
    </Ink>
  )
}

export function MountainStairs() {
  return (
    <Ink>
      <path d="M-96 0L-30 -78L-6 -62L22 -108L58 -70L70 -76L100 0Z" fill={C.stone} />
      <path d="M22 -108L58 -70L70 -76L100 0H64L40 -50Z" fill={C.stoneD} stroke="none" opacity="0.7" />
      <path d="M-40 0L-30 -14L-18 -22L-24 -34L-6 -42L-12 -56L8 -66L2 -80L22 -96" fill="none" strokeWidth="5" stroke={INK} />
      <path d="M-40 0L-30 -14L-18 -22L-24 -34L-6 -42L-12 -56L8 -66L2 -80L22 -96" fill="none" strokeWidth="2.4" stroke={C.cream} strokeDasharray="4 3" />
      <path d="M18 -108V-122M26 -108V-118" strokeWidth="2.2" />
      <path d="M12 -122H34L30 -128H16Z" fill={C.terra} />
      <path d="M-10 -66Q0 -80 10 -70" stroke={C.leaf} strokeWidth="5" fill="none" />
      <path d="M60 -50Q72 -60 84 -50" stroke={C.leaf} strokeWidth="5" fill="none" />
    </Ink>
  )
}

export function Goat() {
  return (
    <Ink>
      <path d="M-90 0L-50 -34L-24 -20L8 -46L46 -22L96 0Z" fill={C.stone} />
      <g transform="translate(-4 -44)">
        <ellipse cx="0" cy="-16" rx="26" ry="14" fill={C.cream} />
        <path d="M-18 -4V10M-8 -2V10M10 -2V10M20 -4V10" strokeWidth="3.4" />
        <path d="M-20 -26L-34 -38L-24 -14Z" fill={C.cream} />
        <circle cx="-30" cy="-32" r="10" fill={C.cream} />
        <path d="M-34 -42Q-44 -56 -52 -46M-26 -42Q-24 -58 -14 -52" fill="none" strokeWidth="3" stroke={C.cocoa} />
        <circle cx="-33" cy="-32" r="1.8" fill={INK} stroke="none" />
        <path d="M-36 -22Q-38 -14 -34 -10" fill="none" strokeWidth="2" />
        <path d="M24 -20Q34 -26 30 -14" fill={C.cream} />
      </g>
      <path d="M52 -14Q60 -26 72 -16M-76 -6Q-66 -16 -56 -8" stroke={C.leaf} strokeWidth="5" fill="none" />
    </Ink>
  )
}

export function JunkBay() {
  return (
    <Ink>
      <Karst x={-80} y={0} w={66} h={70} />
      <Karst x={70} y={0} w={78} h={92} fill={C.stone} shade={C.stoneD} />
      <Karst x={96} y={0} w={40} h={50} />
      {/* junk */}
      <path d="M-34 4Q0 16 36 4L28 -8H-26Z" fill={C.wood} />
      <path d="M-30 -8H30" stroke={C.sun} strokeWidth="2.2" />
      <path d="M-14 -8V-70M10 -8V-60" strokeWidth="2.4" />
      <path d="M-14 -68L-34 -52L-30 -26L-14 -22Z" fill={C.terra} />
      <path d="M-14 -68L6 -54L8 -26L-14 -22Z" fill={C.terraD} />
      <path d="M10 -58L28 -44L26 -22L10 -20Z" fill={C.terra} />
      <path d="M-26 -50H-14M-24 -40H-14M-26 -30H-14" strokeOpacity="0.4" strokeWidth="1.3" />
      <path d="M-100 10Q-80 2 -60 10T-20 10T20 10T60 10T100 10" fill="none" stroke={C.white} strokeWidth="2.6" />
    </Ink>
  )
}

export function Cave() {
  return (
    <Ink>
      <path d="M-100 0V-40Q-92 -90 -40 -100Q0 -112 40 -100Q92 -90 100 -40V0Z" fill={C.stone} />
      <path d="M-70 0V-34Q-66 -70 -30 -78Q0 -86 30 -78Q66 -70 70 -34V0Z" fill={INK} fillOpacity="0.9" />
      <path d="M-70 0V-34Q-66 -70 -30 -78Q0 -86 30 -78Q66 -70 70 -34V0Z" fill="none" />
      {[-52, -34, -12, 10, 34, 54].map((x, i) => (
        <path key={x} d={`M${x - 6} ${-76 + (i % 2) * 4}L${x} ${-52 - (i % 3) * 8}L${x + 6} ${-76 + (i % 2) * 4}Z`} fill={C.stoneD} strokeWidth="1.6" />
      ))}
      {[-44, -4, 40].map((x, i) => (
        <path key={x} d={`M${x - 8} 0L${x} ${-16 - i * 6}L${x + 8} 0Z`} fill={C.stone} strokeWidth="1.6" />
      ))}
      <ellipse cx="-30" cy="-30" rx="22" ry="14" fill={C.terra} fillOpacity="0.5" stroke="none" />
      <ellipse cx="22" cy="-34" rx="26" ry="16" fill={C.jade} fillOpacity="0.45" stroke="none" />
      <ellipse cx="0" cy="-20" rx="18" ry="10" fill={C.sun} fillOpacity="0.45" stroke="none" />
      <Boat x={0} y={-2} w={40} hat={false} color={C.sun} />
    </Ink>
  )
}

export function IslandBeach() {
  return (
    <Ink>
      <path d="M-90 4Q-60 -40 -20 -38Q10 -68 40 -42Q70 -36 96 4Z" fill={C.leaf} />
      <path d="M-84 6Q-60 -6 -30 2Q0 -8 30 2Q60 -6 90 6Z" fill={C.gold} />
      <path d="M10 -64V-92" strokeWidth="2.6" />
      <rect x="2" y="-102" width="18" height="10" fill={C.cream} />
      <path d="M-2 -102L11 -112L24 -102Z" fill={C.terra} />
      <path d="M-30 -36L-16 -50L0 -40" fill="none" strokeWidth="3" stroke={INK} strokeDasharray="4 3" />
      <Palm x={-50} y={0} h={46} lean={-8} s={0.8} />
    </Ink>
  )
}

export function Ferris() {
  const gondolas = Array.from({ length: 10 }).map((_, i) => {
    const a = (i / 10) * Math.PI * 2
    return [Math.cos(a) * 46, -64 + Math.sin(a) * 46, i] as const
  })
  return (
    <Ink>
      <path d="M-30 0L0 -64L30 0" fill="none" strokeWidth="3.2" />
      <path d="M-18 -26H18" strokeWidth="2.2" />
      <circle cx="0" cy="-64" r="46" fill="none" strokeWidth="2.6" />
      <circle cx="0" cy="-64" r="30" fill="none" strokeWidth="1.6" strokeOpacity="0.5" />
      {gondolas.map(([x, y, i]) => (
        <g key={i}>
          <path d={`M0 -64L${x} ${y}`} strokeWidth="1.6" strokeOpacity="0.55" />
          <rect x={x - 5} y={y - 3} width="10" height="9" rx="2" fill={[C.terra, C.sun, C.jade, C.dusk][i % 4]} strokeWidth="1.6" />
        </g>
      ))}
      <circle cx="0" cy="-64" r="5" fill={C.sun} />
      <path d="M-100 0Q-84 -22 -66 -10Q-50 -30 -34 -2" fill="none" strokeWidth="2.4" />
      <path d="M40 -6Q62 -30 84 -8Q92 -20 100 -4" fill="none" strokeWidth="2.4" />
    </Ink>
  )
}

export function BeachParasol() {
  return (
    <Ink>
      <Palm x={-66} y={0} h={74} lean={10} />
      <Palm x={78} y={0} h={52} lean={-12} s={0.85} />
      <g>
        <path d="M-8 0V-52" strokeWidth="3" />
        <path d="M-40 -48Q-8 -84 24 -48Z" fill={C.terra} />
        <path d="M-24 -50Q-8 -78 8 -50M-8 -84V-50" stroke={C.cream} strokeWidth="2" fill="none" />
      </g>
      <path d="M26 -2H58L52 -10H32Z" fill={C.jade} />
      <path d="M-100 8Q-82 -4 -64 8T-28 8T8 8T44 8T80 8T100 8" fill="none" stroke={C.white} strokeWidth="2.6" />
    </Ink>
  )
}

export function PassRoad() {
  return (
    <Ink>
      <path d="M-100 0L-70 -44L-46 -30L-8 -84L26 -50L48 -64L100 0Z" fill={C.stone} />
      <path d="M-8 -84L26 -50L48 -64L100 0H60L18 -40Z" fill={C.stoneD} stroke="none" opacity="0.7" />
      <path d="M-30 0Q-10 -10 -30 -22T-4 -40Q14 -48 0 -58" fill="none" strokeWidth="6" stroke={INK} />
      <path d="M-30 0Q-10 -10 -30 -22T-4 -40Q14 -48 0 -58" fill="none" strokeWidth="3.4" stroke={C.cream} />
      <path d="M-90 -6Q-70 -16 -52 -6" stroke={C.leaf} strokeWidth="5" fill="none" />
      <path d="M62 -12Q78 -22 92 -10" stroke={C.leaf} strokeWidth="5" fill="none" />
      <path d="M40 4Q52 -4 66 4T92 4" stroke={C.jade} strokeWidth="3.4" fill="none" />
    </Ink>
  )
}

export function Canyon() {
  return (
    <Ink>
      <path d="M-104 0V-96Q-86 -80 -70 -92Q-52 -60 -40 0Z" fill={C.stone} />
      <path d="M104 0V-110Q86 -90 70 -100Q50 -64 40 0Z" fill={C.stoneD} />
      <path d="M-92 -40Q-78 -50 -66 -40M70 -50Q84 -60 96 -48" stroke={C.leaf} strokeWidth="5" fill="none" />
      <path d="M-40 4Q-10 -6 0 4T40 4" fill={C.jade} stroke="none" />
      <Boat x={4} y={4} w={52} color={C.sun} />
      {[-22, 22].map((x) => (
        <circle key={x} cx={x} cy="-12" r="3.4" fill={C.terra} strokeWidth="1.5" />
      ))}
    </Ink>
  )
}

export function TwinHills() {
  return (
    <Ink>
      <ellipse cx="-36" cy="0" rx="58" ry="62" fill={C.leaf} />
      <ellipse cx="42" cy="0" rx="52" ry="52" fill={C.leafD} />
      <path d="M-70 -34Q-36 -50 -4 -32M-60 -16Q-36 -26 -10 -14" fill="none" strokeOpacity="0.4" strokeWidth="1.8" />
      <path d="M20 -26Q44 -38 66 -22M26 -10Q46 -18 62 -8" fill="none" strokeOpacity="0.4" strokeWidth="1.8" />
      <circle cx="-36" cy="-64" r="3.6" fill={C.terra} />
      <circle cx="42" cy="-54" r="3.6" fill={C.terra} />
      <Cloud x={-4} y={-30} s={1.1} opacity={0.95} />
    </Ink>
  )
}

export function VeggieGarden() {
  return (
    <Ink>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <path d={`M${-96 + i * 8} ${-4 - i * 12}Q0 ${-18 - i * 12} ${96 - i * 8} ${-4 - i * 12}V${-12 - i * 12}Q0 ${-26 - i * 12} ${-96 + i * 8} ${-12 - i * 12}Z`} fill={i % 2 ? C.leaf : C.leafD} />
        </g>
      ))}
      {[-70, -40, -10, 22, 54, 80].map((x, i) => (
        <path key={x} d={`M${x} ${-20 - (i % 3) * 8}q4 -10 8 0M${x + 3} ${-20 - (i % 3) * 8}v-4`} stroke={C.leaf} strokeWidth="2" fill="none" />
      ))}
      <path d="M46 -52L62 -66L78 -52Z" fill={C.cream} strokeWidth="2" />
      <path d="M62 -52V-30M54 -30H70" strokeWidth="3" />
      <rect x="44" y="-30" width="22" height="18" rx="3" fill={C.wood} strokeWidth="2" />
    </Ink>
  )
}

export function CableCar() {
  return (
    <Ink>
      <path d="M-100 -96L100 -52" strokeWidth="2" />
      <path d="M-100 -90L100 -46" strokeWidth="1.2" strokeOpacity="0.4" />
      <path d="M-80 -56L-36 -30L-6 -40L30 -16L70 -26L100 0H-100V-8Z" fill={C.leaf} />
      <g transform="translate(-6 -76) rotate(7)">
        <path d="M0 0V16" strokeWidth="2.4" />
        <rect x="-18" y="16" width="36" height="26" rx="5" fill={C.terra} />
        <rect x="-13" y="21" width="9" height="12" fill={C.cream} strokeWidth="1.6" />
        <rect x="-1" y="21" width="9" height="12" fill={C.cream} strokeWidth="1.6" />
        <rect x="11" y="21" width="5" height="12" fill={C.cream} strokeWidth="1.6" />
      </g>
      <path d="M-100 8Q-84 -2 -66 8T-30 8T6 8T42 8T78 8T100 8" fill="none" stroke={C.sea} strokeWidth="3" />
    </Ink>
  )
}

export function Barrels() {
  return (
    <Ink>
      {[
        [-52, 62],
        [4, 78],
        [58, 58],
      ].map(([x, h]) => (
        <g key={x}>
          <path d={`M${x - 28} 0Q${x - 36} ${-h / 2} ${x - 28} ${-h}H${x + 28}Q${x + 36} ${-h / 2} ${x + 28} 0Z`} fill={C.wood} />
          <path d={`M${x - 18} 0V${-h}M${x - 6} 0V${-h}M${x + 6} 0V${-h}M${x + 18} 0V${-h}`} strokeOpacity="0.3" strokeWidth="1.3" />
          <path d={`M${x - 33} ${-h * 0.25}H${x + 33}M${x - 33} ${-h * 0.75}H${x + 33}`} strokeWidth="3" stroke={C.cocoa} />
          <ellipse cx={x} cy={-h} rx="28" ry="6" fill={C.cocoa} />
        </g>
      ))}
      <path d="M40 -76L70 -108M70 -76L40 -108" strokeWidth="2" />
      <path d="M-80 -28Q-70 -36 -56 -30" fill={C.terra} strokeWidth="1.6" />
      <path d="M72 -20q8 -8 16 0q-8 8 -16 0zM88 -20l7 -5v10z" fill={C.sea} strokeWidth="1.6" />
    </Ink>
  )
}

export function Waterfall() {
  return (
    <Ink>
      <path d="M-100 0V-80Q-84 -92 -66 -84L-46 -60V0Z" fill={C.stoneD} />
      <path d="M100 0V-70Q84 -82 66 -74L46 -50V0Z" fill={C.stone} />
      <path d="M-46 -90H46L40 0H-40Z" fill={C.white} stroke={INK} />
      {[-22, -4, 14, 28].map((x) => (
        <path key={x} d={`M${x} -86V-6`} stroke={C.water} strokeWidth="3" fill="none" />
      ))}
      <path d="M-100 -76Q-80 -96 -52 -84M100 -66Q82 -88 52 -76" fill={C.leaf} stroke="none" />
      <ellipse cx="0" cy="2" rx="48" ry="9" fill={C.water} />
      <path d="M-30 4Q-20 -6 -10 4M6 2Q16 -8 26 2" stroke={C.white} strokeWidth="2" fill="none" />
      <path d="M-84 -18Q-70 -30 -56 -18" stroke={C.leafD} strokeWidth="6" fill="none" />
    </Ink>
  )
}

export function FishingVillage() {
  return (
    <Ink>
      {[-62, 0, 62].map((x, i) => (
        <g key={x}>
          {[-18, 18].map((dx) => (
            <path key={dx} d={`M${x + dx} 4V-22`} strokeWidth="3.4" />
          ))}
          <rect x={x - 28} y="-52" width="56" height="30" fill={i % 2 ? C.wall : C.cream} />
          <path d={`M${x - 36} -52L${x} -76L${x + 36} -52Z`} fill={C.jadeD} />
          <rect x={x - 6} y="-44" width="12" height="22" fill={C.terra} strokeWidth="1.6" />
          <Window x={x - 22} y={-46} w={8} h={10} fill={C.sun} />
          <Window x={x + 14} y={-46} w={8} h={10} fill={C.sun} />
        </g>
      ))}
      <path d="M-100 -22H100" strokeWidth="2.2" />
      <Boat x={-30} y={10} w={46} hat={false} color={C.sea} />
      <Boat x={46} y={10} w={40} color={C.terra} />
    </Ink>
  )
}

export function LakePines() {
  return (
    <Ink>
      <Pine x={-78} y={-6} h={72} w={32} />
      <Pine x={-52} y={-2} h={58} w={28} />
      <Pine x={70} y={-6} h={78} w={34} />
      <Pine x={96} y={-2} h={52} w={26} />
      <path d="M-30 -2Q0 -10 30 -2" fill="none" strokeWidth="2" />
      {/* swan pedal boat */}
      <g transform="translate(4 -2)">
        <path d="M-26 0Q0 14 26 0Z" fill={C.white} />
        <path d="M-20 -2Q-26 -26 -12 -34Q-4 -38 -2 -30" fill="none" strokeWidth="5" stroke={INK} />
        <path d="M-20 -2Q-26 -26 -12 -34Q-4 -38 -2 -30" fill="none" strokeWidth="2.6" stroke={C.white} />
        <circle cx="-7" cy="-36" r="6" fill={C.white} />
        <path d="M-2 -36L5 -33L-2 -31Z" fill={C.sun} strokeWidth="1.4" />
        <circle cx="-8" cy="-37" r="1.2" fill={INK} stroke="none" />
      </g>
      <path d="M-60 8Q-40 0 -20 8M20 8Q40 0 60 8" stroke={C.white} strokeWidth="2.4" fill="none" />
    </Ink>
  )
}

export function TeaHills() {
  return (
    <Ink>
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M-104 ${-8 - i * 20}Q-30 ${-30 - i * 20} 0 ${-18 - i * 20}T104 ${-26 - i * 20}V${-i * 20 + 6}H-104Z`}
          fill={[C.leaf, C.leafD, C.leaf, C.leafD][i]}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M-90 ${-8 - i * 20}Q-30 ${-26 - i * 20} 0 ${-14 - i * 20}T96 ${-22 - i * 20}`} fill="none" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 3" />
      ))}
      <g transform="translate(34 -28)">
        <circle cx="0" cy="-16" r="4.4" fill={C.cocoa} strokeWidth="1.6" />
        <path d="M-9 -18L0 -28L9 -18Z" fill={C.cream} strokeWidth="1.8" />
        <path d="M-5 -12H5V8H-5Z" fill={C.terra} strokeWidth="1.8" />
        <path d="M6 -8Q16 -6 14 6" fill="none" strokeWidth="2.4" />
        <path d="M-5 8L-6 20M5 8L6 20" strokeWidth="2.4" />
      </g>
    </Ink>
  )
}

export function ClayTunnel() {
  return (
    <Ink>
      <path d="M-100 0V-50Q-96 -100 0 -104Q96 -100 100 -50V0Z" fill={C.cocoa} />
      <path d="M-62 0V-40Q-58 -76 0 -80Q58 -76 62 -40V0Z" fill={INK} fillOpacity="0.88" />
      {[-84, -76, 76, 84].map((x, i) => (
        <circle key={x} cx={x} cy={-30 - i * 6} r="9" fill={C.wood} strokeWidth="1.6" />
      ))}
      {[-82, 82].map((x) => (
        <g key={x}>
          <circle cx={x} cy="-62" r="12" fill={C.wood} />
          <circle cx={x - 4} cy="-64" r="1.6" fill={INK} stroke="none" />
          <circle cx={x + 4} cy="-64" r="1.6" fill={INK} stroke="none" />
          <path d={`M${x - 5} -57Q${x} -53 ${x + 5} -57`} fill="none" strokeWidth="1.6" />
        </g>
      ))}
      <path d="M-30 0Q0 -22 30 0" fill={C.sun} fillOpacity="0.6" stroke="none" />
    </Ink>
  )
}

export function ValleyFlowers() {
  const dots = [
    [-70, -16, C.terra],
    [-48, -26, C.sun],
    [-22, -14, C.dusk],
    [8, -28, C.terra],
    [34, -16, C.sun],
    [60, -26, C.dusk],
    [82, -14, C.terra],
    [-82, -34, C.sun],
    [-30, -38, C.terra],
    [18, -42, C.dusk],
    [70, -40, C.sun],
  ] as const
  return (
    <Ink>
      <path d="M-104 0Q-80 -58 -40 -46Q-14 -76 14 -48Q56 -66 80 -40Q98 -34 104 0Z" fill={C.leaf} />
      <path d="M-30 0Q0 -22 30 0Q0 12 -30 0Z" fill={C.water} />
      <path d="M-12 -4q4 -8 12 0q8 -8 12 0q-8 6 -12 10q-4 -4 -12 -10z" fill={C.terra} strokeWidth="1.6" />
      {dots.map(([x, y, c]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="5" fill={c} strokeWidth="1.5" />
          <circle cx={x} cy={y} r="1.6" fill={C.cream} stroke="none" />
        </g>
      ))}
    </Ink>
  )
}
