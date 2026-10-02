import { C, INK } from './palette'
import { Ink, Lantern, Steam } from './parts'

/* Food, drink and little street scenes: the object is the landmark. Local origin: table top centre. */

export function Cup({ kind = 'egg' }: { kind?: 'egg' | 'phin' | 'cafe' }) {
  if (kind === 'phin') {
    return (
      <Ink>
        <path d="M-30 0L-26 -46H26L30 0Z" fill={C.cream} strokeOpacity="1" />
        <path d="M-26 -30H26" stroke={C.terra} strokeWidth="5" />
        <path d="M-34 -46H34V-52H-34Z" fill={C.stoneD} />
        <path d="M-26 -52L-20 -70H20L26 -52Z" fill={C.stoneD} />
        <rect x="-8" y="-78" width="16" height="8" rx="3" fill={C.stone} />
        <path d="M0 -50V-34" stroke={C.cocoa} strokeWidth="3" strokeDasharray="3 3" />
        <path d="M-24 -4H24L22 -20H-22Z" fill={C.cocoa} stroke="none" />
        <Steam x={0} y={-82} />
        <ellipse cx="0" cy="4" rx="48" ry="6" fill={C.stone} />
      </Ink>
    )
  }
  return (
    <Ink>
      <ellipse cx="0" cy="3" rx="64" ry="9" fill={C.stone} />
      <path d="M-40 -42H40Q40 -2 14 -2H-14Q-40 -2 -40 -42Z" fill={C.cream} />
      <path d="M40 -34Q64 -34 62 -18Q60 -6 38 -10" fill="none" strokeWidth="6" stroke={INK} />
      <path d="M40 -34Q64 -34 62 -18Q60 -6 38 -10" fill="none" strokeWidth="2.6" stroke={C.cream} />
      <ellipse cx="0" cy="-42" rx="40" ry="9" fill={kind === 'egg' ? C.sun : C.cocoa} />
      <path d="M-22 -43Q-8 -50 6 -43Q16 -38 26 -44" fill="none" strokeWidth="2.4" stroke={kind === 'egg' ? C.sunD : C.wood} />
      <path d="M-26 -22H26" stroke={C.terra} strokeWidth="3" strokeOpacity="0.9" />
      <Steam x={-8} y={-54} />
      {kind === 'cafe' && <path d="M-6 -42l-3 -4M6 -42l3 -4" stroke={C.cream} strokeWidth="2" />}
    </Ink>
  )
}

export function Bowl({ kind = 'pho' }: { kind?: 'pho' | 'cao' | 'bunCha' | 'cracker' }) {
  if (kind === 'bunCha') {
    return (
      <Ink>
        <ellipse cx="0" cy="3" rx="82" ry="8" fill={C.stone} />
        <path d="M-78 -26H-6Q-6 0 -34 0H-50Q-78 0 -78 -26Z" fill={C.cream} />
        <ellipse cx="-42" cy="-26" rx="36" ry="7" fill={C.wood} />
        {[-56, -40, -26].map((x) => (
          <circle key={x} cx={x} cy="-27" r="6" fill={C.cocoa} strokeWidth="1.6" />
        ))}
        <path d="M14 -16H78L70 0H22Z" fill={C.white} />
        <path d="M20 -16Q30 -34 44 -22Q58 -34 72 -16" fill={C.cream} />
        {[22, 36, 50, 64].map((x) => (
          <path key={x} d={`M${x} -18Q${x + 6} -26 ${x + 12} -18`} fill="none" strokeOpacity="0.5" strokeWidth="1.4" />
        ))}
        <path d="M8 -8Q20 -34 30 -38M14 -6Q26 -30 38 -36" stroke={C.wood} strokeWidth="2.6" fill="none" />
        <circle cx="62" cy="-24" r="5" fill={C.leaf} strokeWidth="1.6" />
        <Steam x={-42} y={-36} s={0.9} />
      </Ink>
    )
  }
  return (
    <Ink>
      <ellipse cx="0" cy="4" rx="70" ry="8" fill={C.stone} />
      <path d="M-62 -34H62Q62 4 24 4H-24Q-62 4 -62 -34Z" fill={C.terra} />
      <path d="M-52 -14H52" stroke={C.cream} strokeWidth="3" strokeOpacity="0.9" />
      <ellipse cx="0" cy="-34" rx="62" ry="12" fill={kind === 'pho' ? C.sun : C.cream} />
      {kind === 'pho' && (
        <>
          <ellipse cx="0" cy="-34" rx="50" ry="8" fill={C.gold} stroke="none" />
          {[-28, -6, 18].map((x) => (
            <path key={x} d={`M${x - 11} -36Q${x} -44 ${x + 11} -36Q${x} -29 ${x - 11} -36Z`} fill={C.terra} strokeWidth="1.8" />
          ))}
          <circle cx="30" cy="-33" r="6" fill={C.leaf} strokeWidth="1.6" />
          <circle cx="-38" cy="-32" r="5" fill={C.leaf} strokeWidth="1.6" />
          <path d="M8 -30l3 -4l3 4z" fill={C.cocoa} stroke="none" />
        </>
      )}
      {kind === 'cao' && (
        <>
          <path d="M-44 -34Q-30 -46 -16 -34T12 -34T40 -34" fill="none" stroke={C.cream} strokeWidth="3" />
          {[-26, 0, 24].map((x) => (
            <rect key={x} x={x - 9} y="-40" width="18" height="7" rx="2" fill={C.cocoa} strokeWidth="1.6" />
          ))}
          <circle cx="40" cy="-34" r="5.4" fill={C.leaf} strokeWidth="1.6" />
        </>
      )}
      {kind === 'cracker' && (
        <>
          {[-32, -6, 20, 40].map((x, i) => (
            <rect key={x} x={x - 10} y={-44 + (i % 2) * 4} width="20" height="12" rx="2" fill={C.wall} strokeWidth="1.8" transform={`rotate(${i * 7 - 10} ${x} -38)`} />
          ))}
          <path d="M-14 -46l6 -6l6 6" fill="none" strokeWidth="1.8" />
        </>
      )}
      <path d="M-30 -52L26 -80M-22 -52L34 -78" stroke={C.cocoa} strokeWidth="3.4" />
      <Steam x={-14} y={-52} />
      <Steam x={22} y={-52} s={0.9} />
    </Ink>
  )
}

export function BanhMi() {
  return (
    <Ink>
      <ellipse cx="0" cy="4" rx="74" ry="8" fill={C.stone} />
      <path d="M-62 -4Q-76 -22 -48 -38Q0 -56 48 -38Q76 -22 62 -4Q0 8 -62 -4Z" fill={C.wall} />
      <path d="M-52 -26Q-20 -42 20 -34Q40 -30 54 -22" fill="none" strokeOpacity="0.45" strokeWidth="1.8" />
      <path d="M-40 -10Q-20 -26 4 -22Q28 -16 44 -10" fill={C.leaf} stroke="none" />
      <path d="M-46 -12Q-30 -20 -10 -14Q8 -8 20 -14T50 -12" fill={C.terra} stroke="none" />
      <path d="M-30 -16Q-12 -24 6 -16" fill={C.cream} stroke="none" />
      {[-46, -18, 10, 38].map((x) => (
        <path key={x} d={`M${x} -34q6 -6 12 0`} fill="none" strokeOpacity="0.4" strokeWidth="1.6" />
      ))}
      <Steam x={0} y={-52} s={0.8} />
      <circle cx="-54" cy="-30" r="3" fill={C.sun} strokeWidth="1.4" />
    </Ink>
  )
}

export function Seafood() {
  return (
    <Ink>
      <ellipse cx="0" cy="0" rx="86" ry="14" fill={C.cream} />
      <ellipse cx="0" cy="-2" rx="66" ry="9" fill={C.white} />
      {/* crab */}
      <g transform="translate(-24 -26)">
        <ellipse cx="0" cy="0" rx="26" ry="16" fill={C.terra} />
        <path d="M-26 -4Q-40 -18 -30 -26M26 -4Q40 -18 30 -26" fill="none" strokeWidth="5" stroke={INK} />
        <path d="M-26 -4Q-40 -18 -30 -26M26 -4Q40 -18 30 -26" fill="none" strokeWidth="2.6" stroke={C.terra} />
        <path d="M-18 8L-28 16M-8 12L-12 22M8 12L12 22M18 8L28 16" strokeWidth="2.4" />
        <circle cx="-8" cy="-10" r="3.4" fill={C.white} strokeWidth="1.6" />
        <circle cx="8" cy="-10" r="3.4" fill={C.white} strokeWidth="1.6" />
        <circle cx="-8" cy="-10" r="1.2" fill={INK} stroke="none" />
        <circle cx="8" cy="-10" r="1.2" fill={INK} stroke="none" />
      </g>
      {/* prawns */}
      {[28, 52].map((x, i) => (
        <path key={x} d={`M${x - 16} -8Q${x - 18} -34 ${x + 2} -34Q${x + 18} -34 ${x + 14} -14Q${x + 22} -10 ${x + 18} -2`} fill="none" strokeWidth="9" stroke={INK} transform={`translate(0 ${i * 3})`} />
      ))}
      {[28, 52].map((x, i) => (
        <path key={x} d={`M${x - 16} -8Q${x - 18} -34 ${x + 2} -34Q${x + 18} -34 ${x + 14} -14Q${x + 22} -10 ${x + 18} -2`} fill="none" strokeWidth="5.4" stroke={C.terra} transform={`translate(0 ${i * 3})`} />
      ))}
      <path d="M40 -8l8 -5l4 8z" fill={C.leaf} strokeWidth="1.4" />
      <path d="M-62 -6l8 -8l8 8z" fill={C.sun} strokeWidth="1.6" />
    </Ink>
  )
}

export function Cauldron() {
  return (
    <Ink>
      <path d="M-62 -18Q-66 6 -34 6H34Q66 6 62 -18Z" fill={C.cocoa} />
      <ellipse cx="0" cy="-18" rx="62" ry="10" fill={C.stoneD} />
      <ellipse cx="0" cy="-19" rx="52" ry="7" fill={C.terra} />
      {[-30, -8, 16, 34].map((x, i) => (
        <circle key={x} cx={x} cy={-20 + (i % 2) * 2} r="4.6" fill={i % 2 ? C.sun : C.cream} strokeWidth="1.6" />
      ))}
      <path d="M-62 -16H-76M62 -16H76" strokeWidth="4" />
      <path d="M-44 6Q-40 -4 -30 6M-6 6Q0 -6 8 6M30 6Q38 -4 44 6" fill={C.sun} strokeWidth="1.8" />
      <path d="M-32 6V12M0 6V12M32 6V12" strokeWidth="3" />
      <Steam x={-18} y={-30} />
      <Steam x={18} y={-30} s={1.1} />
    </Ink>
  )
}

export function GrilledSnack() {
  return (
    <Ink>
      <ellipse cx="0" cy="4" rx="76" ry="8" fill={C.stone} />
      <path d="M-56 -16H56L46 4H-46Z" fill={C.wood} />
      <path d="M-46 -16V4M-30 -16V4M-14 -16V4M2 -16V4M18 -16V4M34 -16V4" strokeOpacity="0.4" strokeWidth="1.4" />
      <circle cx="0" cy="-26" r="40" fill={C.cream} />
      <circle cx="0" cy="-26" r="40" fill="none" />
      <circle cx="0" cy="-26" r="32" fill={C.wall} stroke="none" opacity="0.8" />
      {[
        [-14, -34, C.terra],
        [10, -40, C.leaf],
        [16, -20, C.sun],
        [-18, -16, C.leaf],
        [2, -26, C.terra],
        [26, -34, C.cocoa],
        [-28, -28, C.sun],
      ].map(([x, y, c]) => (
        <circle key={`${x}${y}`} cx={x as number} cy={y as number} r="4.6" fill={c as string} strokeWidth="1.5" />
      ))}
      <path d="M-40 -40Q-52 -52 -64 -46" stroke={C.terraD} strokeWidth="3" fill="none" />
      <Steam x={0} y={-68} s={0.9} />
      <Lantern x={-70} y={-28} r={4.4} string={14} />
    </Ink>
  )
}
