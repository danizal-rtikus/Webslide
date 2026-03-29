
export type SvgTemplateParams = {
  primaryColor: string;
  secondaryColor?: string;
  backgroundColor?: string;
};

export const SVG_TEMPLATES: Record<string, (params: SvgTemplateParams) => string> = {
  'data-transfer': (params) => {
    const p = params.primaryColor || '#4f46e5';
    const s = params.secondaryColor || '#10b981';
    const bg = params.backgroundColor || '#F8FAFC';

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <path id="data-arc" d="M 245.3 222 Q 383 100 521 353" fill="none" stroke="${p}" stroke-width="3" stroke-dasharray="8 8" opacity="0.4" />
    <g id="data-bit">
      <polygon points="0,-10 16,0 0,10 -16,0" fill="${bg}" opacity="0.9" />
      <polygon points="-16,0 0,10 0,16 -16,6" fill="${p}" />
      <polygon points="16,0 0,10 0,16 16,6" fill="${s}" />
    </g>
  </defs>

  <g id="computer-left" transform="translate(150, 100)">
    <ellipse cx="62" cy="245" rx="60" ry="30" fill="#E2E8F0" opacity="0.8" />
    <ellipse cx="62" cy="202" rx="40" ry="20" fill="${p}" opacity="0.6" />
    <rect x="22" y="195" width="80" height="7" fill="${p}" opacity="0.6" />
    <ellipse cx="62" cy="195" rx="40" ry="20" fill="#D0E3EA" />
    <polygon points="60,140 60,195 50,190 50,135" fill="${p}" opacity="0.8" />
    <polygon points="60,140 73,148 73,200 60,195" fill="${p}" />
    <polygon points="0,0 0,120 -17.3,110 -17.3,-10" fill="${p}" opacity="0.7" />
    <polygon points="0,0 138.6,80 121.3,70 -17.3,-10" fill="#D0E3EA" />
    <g transform="matrix(0.866, 0.5, 0, 1, 0, 0)">
      <rect width="160" height="120" rx="4" fill="${p}" opacity="0.3" />
      <rect x="8" y="8" width="144" height="104" rx="3" fill="#2D3142" />
      <rect x="8" y="8" width="144" height="15" fill="#3F445A" rx="2" />
      <circle cx="16" cy="15" r="3" fill="#FF5F56" />
      <circle cx="26" cy="15" r="3" fill="#FFBD2E" />
      <circle cx="36" cy="15" r="3" fill="#27C93F" />
      <circle cx="110" cy="67" r="15" fill="${p}" opacity="0.2">
        <animate attributeName="r" values="10; 22; 10" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4; 0; 0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="110" cy="67" r="10" fill="${p}" />
    </g>
  </g>

  <g id="computer-right" transform="translate(450, 250)">
    <ellipse cx="62" cy="245" rx="60" ry="30" fill="#E2E8F0" opacity="0.8" />
    <ellipse cx="62" cy="202" rx="40" ry="20" fill="${s}" opacity="0.6" />
    <rect x="22" y="195" width="80" height="7" fill="${s}" opacity="0.6" />
    <ellipse cx="62" cy="195" rx="40" ry="20" fill="#D8F3DC" />
    <polygon points="60,140 60,195 50,190 50,135" fill="${s}" opacity="0.8" />
    <polygon points="60,140 73,148 73,200 60,195" fill="${s}" />
    <polygon points="0,0 0,120 -17.3,110 -17.3,-10" fill="${s}" opacity="0.7" />
    <polygon points="0,0 138.6,80 121.3,70 -17.3,-10" fill="#D8F3DC" />
    <g transform="matrix(0.866, 0.5, 0, 1, 0, 0)">
      <rect width="160" height="120" rx="4" fill="${s}" opacity="0.3" />
      <rect x="8" y="8" width="144" height="104" rx="3" fill="#2D3142" />
      <rect x="8" y="8" width="144" height="15" fill="#3F445A" rx="2" />
      <circle cx="82" cy="62" r="15" fill="${p}" opacity="0.2">
        <animate attributeName="r" values="18; 28; 18" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4; 0; 0.4" dur="2s" repeatCount="indefinite" />
      </circle>
    </g>
  </g>

  <use href="#data-arc">
    <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.8s" repeatCount="indefinite" />
  </use>

  <g>
    <use href="#data-bit" />
    <animateMotion dur="2.4s" repeatCount="indefinite" begin="0s">
      <mpath href="#data-arc" />
    </animateMotion>
    <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.05; 0.9; 1" dur="2.4s" repeatCount="indefinite" begin="0s" />
  </g>

  <g>
    <use href="#data-bit" />
    <animateMotion dur="2.4s" repeatCount="indefinite" begin="0.8s">
      <mpath href="#data-arc" />
    </animateMotion>
    <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.05; 0.9; 1" dur="2.4s" repeatCount="indefinite" begin="0.8s" />
  </g>

  <g>
    <use href="#data-bit" />
    <animateMotion dur="2.4s" repeatCount="indefinite" begin="1.6s">
      <mpath href="#data-arc" />
    </animateMotion>
    <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.05; 0.9; 1" dur="2.4s" repeatCount="indefinite" begin="1.6s" />
  </g>
</svg>
    `;
  },
  'cloud-sync': (params) => {
    const p = params.primaryColor || '#4f46e5';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <path id="up-path" d="M 300 350 L 500 150" fill="none" stroke="${p}" stroke-width="2" stroke-dasharray="5 5" opacity="0.3" />
    <g id="cloud-bit"><circle r="8" fill="${p}" /></g>
  </defs>
  <g transform="translate(250, 320)">
    <rect width="100" height="60" rx="8" fill="#2D3142" />
    <rect x="5" y="5" width="90" height="40" rx="4" fill="#3F445A" />
    <circle cx="50" cy="52" r="3" fill="${p}" />
  </g>
  <g transform="translate(500, 100)">
    <path d="M25 50 Q10 50 10 35 Q10 20 25 20 Q25 5 45 5 Q65 5 65 20 Q80 20 80 35 Q80 50 65 50 Z" fill="${p}" opacity="0.8">
      <animate attributeName="opacity" values="0.8; 0.5; 0.8" dur="4s" repeatCount="indefinite" />
    </path>
    <animateTransform attributeName="transform" type="translate" values="500,100; 500,90; 500,100" dur="4s" repeatCount="indefinite" />
  </g>
  <g>
    <use href="#cloud-bit" />
    <animateMotion dur="2s" repeatCount="indefinite"><mpath href="#up-path" /></animateMotion>
    <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
  </g>
</svg>`;
  },
  'ai-process': (params) => {
    const p = params.primaryColor || '#4f46e5';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(400, 250)">
    <circle r="50" fill="none" stroke="${p}" stroke-width="4" stroke-dasharray="10 5">
       <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" />
    </circle>
    <circle r="30" fill="${p}" opacity="0.2">
       <animate attributeName="r" values="25; 40; 25" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle r="15" fill="${p}" />
    <g>
      <line x1="0" y1="0" x2="100" y2="0" stroke="${p}" stroke-width="2" opacity="0.4" />
      <circle cx="100" cy="0" r="5" fill="${p}" />
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s" repeatCount="indefinite" />
    </g>
    <g>
      <line x1="0" y1="0" x2="-80" y2="60" stroke="${p}" stroke-width="2" opacity="0.4" />
      <circle cx="-80" cy="60" r="5" fill="${p}" />
      <animateTransform attributeName="transform" type="rotate" from="120" to="480" dur="7s" repeatCount="indefinite" />
    </g>
  </svg>`;
  },
  'growth-chart': (params) => {
    const p = params.primaryColor || '#4f46e5';
    const s = params.secondaryColor || '#10b981';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(200, 400)">
    <path d="M 0 0 L 400 0 M 0 0 L 0 -300" stroke="#CBD5E1" stroke-width="2" />
    <g transform="translate(50, 0)">
      <rect x="0" y="0" width="40" height="0" fill="${p}" opacity="0.8">
        <animate attributeName="height" from="0" to="150" dur="1.5s" fill="freeze" />
        <animate attributeName="y" from="0" to="-150" dur="1.5s" fill="freeze" />
      </rect>
    </g>
    <g transform="translate(130, 0)">
      <rect x="0" y="0" width="40" height="0" fill="${s}" opacity="0.8">
        <animate attributeName="height" from="0" to="220" dur="1.5s" begin="0.3s" fill="freeze" />
        <animate attributeName="y" from="0" to="-220" dur="1.5s" begin="0.3s" fill="freeze" />
      </rect>
    </g>
    <g transform="translate(210, 0)">
      <rect x="0" y="0" width="40" height="0" fill="${p}" opacity="0.8">
        <animate attributeName="height" from="0" to="180" dur="1.5s" begin="0.6s" fill="freeze" />
        <animate attributeName="y" from="0" to="-180" dur="1.5s" begin="0.6s" fill="freeze" />
      </rect>
    </g>
    <path d="M 50 -150 L 130 -220 L 210 -180 L 300 -280" fill="none" stroke="${p}" stroke-width="3" stroke-dasharray="800" stroke-dashoffset="800">
      <animate attributeName="stroke-dashoffset" from="800" to="0" dur="3s" fill="freeze" />
    </path>
  </g>
</svg>`;
  },
  'idea-bulb': (params) => {
    const p = params.primaryColor || '#4f46e5';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(400, 250)">
    <circle r="60" fill="${p}" opacity="0.1"><animate attributeName="r" values="60; 90; 60" dur="3s" repeatCount="indefinite" /></circle>
    <path d="M-30,-40 A40,40 0 1,1 30,-40 L20,10 L-20,10 Z" fill="white" stroke="${p}" stroke-width="3" />
    <path d="M-10,-30 Q0,-50 10,-30" fill="none" stroke="${p}" stroke-width="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" /></path>
    <rect x="-15" y="10" width="30" height="15" fill="#94A3B8" />
    <animateTransform attributeName="transform" type="translate" values="400,250; 400,230; 400,250" dur="4s" repeatCount="indefinite" />
  </g>
</svg>`;
  },
  'secure-vault': (params) => {
    const p = params.primaryColor || '#4f46e5';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(400, 250)">
    <path d="M0,-80 L60,-60 L60,0 Q60,60 0,90 Q-60,60 -60,0 L-60,-60 Z" fill="${p}" opacity="0.1" stroke="${p}" stroke-width="2" />
    <rect x="-30" y="-10" width="60" height="50" rx="4" fill="${p}" />
    <path d="M-20,-10 L-20,-30 Q0,-55 20,-30 L20,-10" fill="none" stroke="${p}" stroke-width="6" stroke-linecap="round" />
    <circle cx="0" cy="15" r="5" fill="white" />
    <rect x="-70" y="-90" width="140" height="2" fill="${p}"><animate attributeName="y" values="-90; 100; -90" dur="3s" repeatCount="indefinite" /></rect>
  </g>
</svg>`;
  },
  'education-cap': (params) => {
    const p = params.primaryColor || '#4f46e5';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(400, 250)">
    <polygon points="0,-40 80,0 0,40 -80,0" fill="${p}" />
    <path d="M-40,10 L-40,30 Q0,50 40,30 L40,10" fill="none" stroke="${p}" stroke-width="2" />
    <circle cx="80" cy="55" r="5" fill="${p}" />
    <animateTransform attributeName="transform" type="rotate" values="-2,0,0; 2,0,0; -2,0,0" dur="5s" repeatCount="indefinite" />
  </g>
</svg>`;
  },
  'server-network': (params) => {
    const p = params.primaryColor || '#4f46e5';
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <g id="server-unit">
      <rect width="100" height="40" rx="4" fill="#1E293B" />
      <circle cx="10" cy="20" r="3" fill="#22C55E"><animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" /></circle>
    </g>
  </defs>
  <use href="#server-unit" x="350" y="100" />
  <use href="#server-unit" x="200" y="300" />
  <use href="#server-unit" x="500" y="300" />
  <path d="M400 140 L250 300 M400 140 L550 300 M250 320 L500 320" fill="none" stroke="${p}" stroke-width="2" stroke-dasharray="10 5">
    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="5s" repeatCount="indefinite" />
  </path>
</svg>`;
  }
};
