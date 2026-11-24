/* Illustrated public navigation for Voxel Atlas. All scenes are original SVG. */
const sun = (x, y, r = 28) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#edb55f"/><circle cx="${x}" cy="${y}" r="${r + 9}" fill="none" stroke="#edb55f" stroke-opacity=".25"/>`;
const tree = (x, y, s = 1, color = '#527d58') => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 15v24" stroke="#42614a" stroke-width="4"/><path d="M-19 18 0-25 19 18Z" fill="${color}"/><path d="M-13 0 0-31 13 0Z" fill="${color}"/></g>`;
const cloud = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-48 18c-25 0-30-36-6-44 1-32 44-43 60-18 30-12 54 6 55 32 32 1 37 38 8 40Z" fill="#fffdf0" stroke="#d2e5dc" stroke-width="2"/></g>`;
const waves = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke="#d9f3e9" stroke-width="2.5" stroke-linecap="round" opacity=".66"><path d="M0 0q15-12 30 0t30 0t30 0"/><path d="M27 28q15-12 30 0t30 0t30 0"/><path d="M-20 57q15-12 30 0t30 0t30 0"/></g>`;
const compass = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="1"/><path d="m17 31 4-11 10-3-4 11Z" fill="currentColor"/><circle cx="24" cy="24" r="2" fill="#fbf8ec"/><path d="M24 0v5m0 38v5M0 24h5m38 0h5" stroke="currentColor"/></svg>`;
const tinyCloud = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 25a7 7 0 0 1-2-13 9 9 0 0 1 17-2 8 8 0 0 1 0 15Z" stroke="currentColor" stroke-width="1.6"/></svg>`;
const routeIcon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="7" cy="25" r="3" stroke="currentColor" stroke-width="1.6"/><circle cx="25" cy="7" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M7 22V10a5 5 0 0 1 10 0v12a4 4 0 0 0 8 0V10" stroke="currentColor" stroke-width="1.6"/></svg>`;
const dieIcon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5" y="5" width="22" height="22" rx="5" stroke="currentColor" stroke-width="1.6"/><g fill="currentColor"><circle cx="11" cy="11" r="1.8"/><circle cx="21" cy="11" r="1.8"/><circle cx="16" cy="16" r="1.8"/><circle cx="11" cy="21" r="1.8"/><circle cx="21" cy="21" r="1.8"/></g></svg>`;
const backLink = (href, text) => `<a class="jl-back" href="${href}"><span class="jl-back-dot" aria-hidden="true"></span>${text}</a>`;

function prepare(main, title) {
  main.classList.add('jl-main');
  document.title = `${title} · Voxel Atlas`;
}

export function renderEntrance(main) {
  prepare(main, 'A world of curiosity');
  main.innerHTML = `<section class="jl-world">
    <header class="jl-intro-heading"><div><p class="jl-eyebrow"><span></span> A RESEARCH WORLD, OPEN TO EVERYONE</p><h1>A world of <em>curiosity.</em></h1><p class="jl-intro-copy">Start at the heart. Find your own way.</p></div><div class="jl-compass">${compass}<span>EXPLORE<br>WITHOUT LIMITS</span></div></header>
    <figure class="jl-entrance-scene">
      <svg class="jl-entrance-art" viewBox="0 0 1120 700" xmlns="http://www.w3.org/2000/svg" role="group" aria-labelledby="jl-world-title jl-world-desc">
        <title id="jl-world-title">An illustrated world of connected research</title><desc id="jl-world-desc">A university and medical facility above a central human heart window. A green winding landscape opens Linkers. The sea, a newborn, and a market pavilion complete the scene. Choose a labeled region to enter.</desc>
        <defs>
          <clipPath id="jl-world-clip"><rect width="1120" height="700" rx="22"/></clipPath>
          <pattern id="jl-terrain-dots" width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#315b44" opacity=".10"/></pattern>
          <linearGradient id="jl-heart-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e57a67"/><stop offset="1" stop-color="#a53e46"/></linearGradient>
          <linearGradient id="jl-sea-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9acfc7"/><stop offset="1" stop-color="#67b5b2"/></linearGradient>
          <filter id="jl-soft-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#254734" flood-opacity=".16"/></filter>
        </defs>
        <g clip-path="url(#jl-world-clip)">
          <rect width="1120" height="700" fill="#e9e4cd"/>
          <a href="/research" class="jl-scene-link jl-campus-link" aria-label="Explore the university and research journal">
            <path class="jl-segment" d="M0 0H558V335L341 371 0 327Z" fill="#eedbc1"/>
            <path d="m0 284 161-38 199 57 182-9v70L0 374Z" fill="#e1cdae"/>
            <path d="m54 280 201-38 164 46-207 56Z" fill="#d2b795" opacity=".45"/>
            <g transform="translate(132 120)" class="jl-campus-art">
              <path d="m0 63 116-53 116 53Z" fill="#d19175" stroke="#ae715b" stroke-width="2"/>
              <path d="M16 72h200v100H16Z" fill="#f8efda" stroke="#bd9b7b" stroke-width="2"/>
              <path d="M8 64h216v14H8Zm-9 111h234v13H-1Zm-10 16h255v11H-11Z" fill="#ae8066"/>
              <g fill="#dfc7a6" stroke="#ba9776" stroke-width="1.5"><path d="M35 79h24v93H35Zm48 0h24v93H83Zm48 0h24v93h-24Zm48 0h24v93h-24Z"/></g>
              <circle cx="116" cy="48" r="13" fill="#f8efda"/><path d="M116 40v9l6 4" stroke="#967661" stroke-width="2" fill="none"/>
              <path d="M116 9v-45" stroke="#826a56" stroke-width="3"/><path d="M118-35h41l-11 12 11 11h-41" fill="#c2735b"/>
            </g>
            ${tree(85, 265, .9, '#7c8d64')}${tree(387, 291, .8, '#7c8d64')}
            <text x="56" y="57" class="jl-art-kicker">01 / KNOWLEDGE</text><text x="56" y="89" class="jl-art-label">The university</text>
            <g transform="translate(58 106)"><rect width="167" height="39" rx="19.5" fill="#faf3e3"/><text x="83.5" y="25" text-anchor="middle" class="jl-art-pill">Research journal</text></g>
          </a>
          <a href="/viewer.html" class="jl-scene-link jl-medical-link" aria-label="Enter medical imaging and the MRI explorer">
            <path class="jl-segment" d="M558 0h562v326l-148 83-414-74Z" fill="#d1e3de"/>
            <path d="m672 279 193-52 255 50v74l-172 33Z" fill="#bed4c9"/>
            <g transform="translate(765 143)">
              <path d="m0 62 136-29 108 33-139 31Z" fill="#b5c9c0"/>
              <path d="M0 63v100l105 34V96Z" fill="#d8e5d8" stroke="#8da99d" stroke-width="2"/>
              <path d="m105 96 139-31v99l-139 33Z" fill="#f4f1df" stroke="#8da99d" stroke-width="2"/>
              <ellipse cx="174" cy="122" rx="41" ry="49" fill="#a7beb2"/>
              <ellipse cx="174" cy="122" rx="28" ry="35" fill="#274c49"/>
              <ellipse cx="174" cy="122" rx="17" ry="24" fill="#132f33"/>
              <path d="m148 139 79 37-29 11-79-36Z" fill="#dee6d8" stroke="#90ac9d" stroke-width="2"/>
              <path d="M198 187v22m29-33v21" stroke="#6b8a7e" stroke-width="5"/>
              <path d="m26 97 53 15v36l-53-15Z" fill="#537b73"/><path d="m35 113 8 2 5-8 7 25 5-11 11 4" fill="none" stroke="#bce8c7" stroke-width="2"/>
              <path d="M108 1v31m-15-16h30" stroke="#5e8f80" stroke-width="8"/>
            </g>
            <text x="758" y="57" class="jl-art-kicker">02 / DISCOVERY</text><text x="758" y="89" class="jl-art-label">Inside the body</text>
            <g transform="translate(857 318)"><rect width="180" height="39" rx="19.5" fill="#f1f5e8"/><text x="90" y="25" text-anchor="middle" class="jl-art-pill">Explore MRI in 3D</text></g>
          </a>
          <a href="/linkers" class="jl-scene-link jl-green-link" aria-label="Open Linkers through the green landscape">
            <path class="jl-segment" d="M0 327c154-25 213 75 366 22 129-45 239-3 342 40 70 29 106 54 134 114L751 700H0Z" fill="#afc895"/>
            <path d="M0 434c168-76 230 29 367-21 92-34 223 5 338 54l53 233H0Z" fill="#96b581"/>
            <path d="M0 592c142-80 221-51 296-47 122 7 216-61 335-37l66 192H0Z" fill="#84a975"/>
            <path d="M0 337h730v363H0Z" fill="url(#jl-terrain-dots)"/>
            <path d="M-25 607c112-55 162-15 197-60 45-58-60-69-39-111 19-38 159-14 191 22 38 43-63 42-50 73 13 30 123-16 177 13 47 25-17 58 46 92 23 12 70 14 117 64" fill="none" stroke="#e5e7c7" stroke-width="24"/>
            <path d="M-25 607c112-55 162-15 197-60 45-58-60-69-39-111 19-38 159-14 191 22 38 43-63 42-50 73 13 30 123-16 177 13 47 25-17 58 46 92 23 12 70 14 117 64" fill="none" stroke="#73958a" stroke-width="10"/>
            <path d="M-25 607c112-55 162-15 197-60 45-58-60-69-39-111 19-38 159-14 191 22 38 43-63 42-50 73 13 30 123-16 177 13 47 25-17 58 46 92 23 12 70 14 117 64" fill="none" stroke="#e8edcd" stroke-width="1.5" stroke-dasharray="6 10"/>
            ${tree(331, 377, .65)}${tree(367, 402, .85)}${tree(393, 383, .65)}${tree(364, 591, .8)}${tree(402, 611, 1)}${tree(437, 587, .6)}${tree(48, 656, .85)}${tree(78, 666, .6)}
            <g transform="translate(210 612) rotate(-10)"><path d="M-43 3c-18-13-26 14-10 21 18 8 27-28 45-24 20 4 4 30 27 25 19-4 1-26 24-27" fill="none" stroke="#315e43" stroke-width="11" stroke-linecap="round"/><ellipse cx="48" cy="-2" rx="12" ry="8" fill="#315e43"/><circle cx="52" cy="-5" r="1.4" fill="#f6ead0"/><path d="m59-1 9-1 4-4m-4 4 5 2" stroke="#b36757" stroke-width="1.5" fill="none"/></g>
            <text x="55" y="384" class="jl-art-kicker">03 / CONNECTION</text><text x="55" y="416" class="jl-art-label">The green path</text>
            <g transform="translate(60 475)"><rect width="133" height="42" rx="21" fill="#193f31"/><text x="66.5" y="27" text-anchor="middle" class="jl-art-pill" fill="#f6f3e4">Open Linkers</text></g>
            <text x="55" y="674" class="jl-art-small">A winding road. A new possibility.</text>
          </a>
          <a href="/future-work" class="jl-scene-link jl-sea-link" aria-label="Explore future work through life and the sea">
            <path class="jl-segment" d="M1120 326c-173 24-235 83-316 149-63 52-44 131-122 225h438Z" fill="url(#jl-sea-fill)"/>
            <path d="M1120 326c-173 24-235 83-316 149-63 52-44 131-122 225" fill="none" stroke="#f0e8c4" stroke-width="14"/>
            <path d="M1120 350c-151 21-215 86-281 136-59 45-51 140-115 214" fill="none" stroke="#c5e8da" stroke-width="2" opacity=".7"/>
            ${waves(905, 522)}${waves(797, 629)}
            <g transform="translate(955 446) rotate(14)"><ellipse cy="22" rx="34" ry="50" fill="#f1e6cd" stroke="#427e79" stroke-width="2"/><path d="m-29 0 56 40M29 1-27 40" fill="none" stroke="#b2c8b5" stroke-width="3"/><circle cy="-10" r="22" fill="#e8bf96" stroke="#427e79" stroke-width="2"/><path d="M-9-12v2m18-2v2M-5-2q5 5 10 0M-7-30q5-9 11 0" stroke="#6e614d" stroke-width="2" stroke-linecap="round" fill="none"/></g>
            <g transform="translate(1055 595)"><path d="M-21 15h44l-9 12h-27Z" fill="#285e5e"/><path d="M0-32V15H-22Zm5 5L24 11H5Z" fill="#f4edcf"/><path d="M0-37v52" stroke="#285e5e" stroke-width="2"/></g>
            <text x="841" y="665" class="jl-art-small">LIFE &amp; THE SEA</text>
          </a>
          <a href="/games?game=market" class="jl-scene-link" aria-label="Open the algorithmic trading game">
            <g transform="translate(670 528)"><path d="m-53-6 76-26 62 23-76 28Z" fill="#e6d29f"/><path d="M-53-6v68l62 23V19Z" fill="#ba9765"/><path d="m9 19 76-28v71L9 85Z" fill="#d9ba80"/><path d="m-41-3 50 17 63-23" fill="none" stroke="#f1e4bd" stroke-width="5"/><path d="M-32 16v39m19-31v39M29 24v37m21-45v37m20-45v37" stroke="#e9d8ac" stroke-width="9"/><path d="m-43 66 52 20 74-26" fill="none" stroke="#916e4d" stroke-width="7"/><path d="m-12-35 15-15 15 5 18-25" fill="none" stroke="#38644f" stroke-width="4"/><circle cx="36" cy="-70" r="4" fill="#38644f"/></g>
            <g transform="translate(604 634)"><rect width="152" height="38" rx="19" fill="#f7eed7"/><text x="76" y="25" text-anchor="middle" class="jl-art-pill">Market playground</text></g>
          </a>
          <a href="/synthesis" class="jl-heart-window jl-scene-link" aria-label="Enter synthesis through the heart window">
            <g filter="url(#jl-soft-shadow)"><path d="M443 473V201a117 117 0 0 1 234 0v272Z" fill="#f8f2df" stroke="#fdf9e9" stroke-width="11"/><path d="M456 461V202a104 104 0 0 1 208 0v259Z" fill="#e3e6ce" stroke="#c3cbb5" stroke-width="1.5"/>
              <circle cx="560" cy="218" r="43" fill="#ceae85"/><path d="M517 212c-7-52 75-70 85-13l-8 6c-20-9-29-21-32-26-7 16-27 31-45 33" fill="#4b5c47"/>
              <path d="M527 253v28l-32 15c-30 13-37 51-39 81v84h208v-84c-1-29-12-66-40-80l-32-16v-28" fill="#d8bb91"/>
              <path d="M527 276c15 18 51 20 65 0l27 14c-4 28-23 45-59 44-32-1-53-20-59-43Z" fill="#e9cfaa"/>
              <path d="M486 371v90m148-90v90" stroke="#b99f79" stroke-width="2"/>
              <path d="M563 321c-20-17-43-4-45 17-5 32 15 66 45 89 37-29 56-58 45-86-7-18-26-25-45-20Z" fill="url(#jl-heart-fill)" stroke="#9b504c" stroke-width="2"/>
              <path d="M554 331c-2-21 0-35 16-36v-21h16v29c-12 3-15 15-12 29" fill="#c56659" stroke="#9b504c" stroke-width="2"/>
              <path d="M578 324c6-18 18-24 32-21l5 14c-14-3-24 1-25 15" fill="#5e9192" stroke="#467276" stroke-width="2"/>
              <path d="m546 337 15 25 24 6m-24-6 4 52m-2-27-19 3m20-3 21 13" fill="none" stroke="#efad8c" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M500 467h120" stroke="#c1c6ad" stroke-width="5"/>
            </g>
            <g transform="translate(469 482)"><rect width="182" height="46" rx="23" fill="#183d31"/><text x="91" y="29" text-anchor="middle" class="jl-art-pill" fill="#fff8e8">Start at the heart</text></g>
            <text x="560" y="55" text-anchor="middle" class="jl-art-kicker">THE SYNTHESIS STUDIO</text>
          </a>
          ${sun(670, 69, 17)}
        </g>
      </svg>
      <figcaption class="jl-scene-caption"><span><i class="jl-dot"></i> Every landscape is a doorway.</span><span>Tap the green landscape to discover Linkers.</span></figcaption>
    </figure>
    <nav class="jl-world-shortcuts" aria-label="Explore the research world"><a href="/synthesis"><span>01</span>Synthesis studio</a><a href="/research"><span>02</span>Research journal</a><a href="/linkers"><span>03</span>Linkers &amp; games</a><a href="/workspace"><span>04</span>Research workspace</a></nav>
  </section>`;
}

export function renderLinkers(main) {
  prepare(main, 'Linkers');
  const road = 'M1035 641C907 681 835 668 766 621S646 563 681 507C707 466 773 441 731 403S592 321 528 279 395 221 403 190C410 165 543 201 567 222S587 265 631 269 711 302 758 319 808 342 811 320';
  main.innerHTML = `<section class="jl-world jl-linkers">
    <header class="jl-map-heading"><div>${backLink('/', 'Back to the world')}<p class="jl-eyebrow">LINKERS / THE GREEN PATH / 41°N</p><h1>Everything <em>connects.</em></h1><p class="jl-intro-copy">Welcome to Linkers. Pick a turn, follow a thought.</p></div><a href="/cloud" class="jl-cloud-header">${tinyCloud}<span>Cloud lab<small>THE NEXT STEP</small></span></a></header>
    <figure class="jl-map-scene">
      <svg class="jl-map-art" viewBox="0 0 1100 700" xmlns="http://www.w3.org/2000/svg" role="group" aria-labelledby="jl-linkers-title jl-linkers-desc">
        <title id="jl-linkers-title">Linkers: a winding coastal map</title><desc id="jl-linkers-desc">A blue road winds through green hills beside the sea. The road opens the future-work page. The cloud opens Cloud lab, and the Kuzey Marmara sign opens the browser games.</desc>
        <defs><clipPath id="jl-map-clip"><rect width="1100" height="700" rx="22"/></clipPath><pattern id="jl-map-grain" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1" fill="#234b3c" opacity=".10"/></pattern><linearGradient id="jl-map-sea" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#99d6de"/><stop offset="1" stop-color="#74bdce"/></linearGradient><filter id="jl-sign-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#284938" flood-opacity=".18"/></filter></defs>
        <g clip-path="url(#jl-map-clip)">
          <rect width="1100" height="700" fill="url(#jl-map-sea)"/>
          <path d="M0 129c173 13 282-12 413-36 79-14 115-50 181-46 91 6 142 53 178 92 50 55 148 27 228 67l100 85V700H0Z" fill="#dce5ab"/>
          <path d="M0 129c173 13 282-12 413-36 79-14 115-50 181-46 91 6 142 53 178 92 50 55 148 27 228 67l100 85" stroke="#eee8c5" stroke-width="9" fill="none"/>
          <path d="M0 143c112 8 222 3 341-25m129-29c114-37 173-40 231 8m107 67c49 26 94 12 158 37" fill="none" stroke="#d1eef0" stroke-width="2"/>
          <path d="M0 244c135-83 196-50 243 20 57 85 71 142 145 153 111 15 132-98 241-85 121 16 114 139 225 185 98 39 150-20 246 0v183H0Z" fill="#c0d696"/>
          <path d="M0 528c140 57 204-65 278-106 68-38 152 10 196 77 52 78 94 142 191 158 131 22 218-105 303-71l132 61v53H0Z" fill="#a9c786"/>
          <path d="M757 139c86 65 60 127 144 200 62 54 128 24 199 62v129c-97-18-122-17-177-63-83-69-79-153-143-192-54-33-70-82-23-136Z" fill="#c8dd9d"/>
          <path d="M0 179c100 3 171 42 177 104 10 91-103 140-177 164Z" fill="#eae5c3"/>
          <path d="M0 0h1100v700H0Z" fill="url(#jl-map-grain)"/>
          <g fill="none" stroke="#8ea774" stroke-width="1" opacity=".25"><path d="M67 381c58-31 52-67 43-97m18 111c60-41 55-82 36-117m130 62c81 60 168 22 185-25m-201 49c73 70 185 26 222-27M851 493c62 35 87 9 143 35m-143-3c61 28 95 11 124 33M329 568c64 80 98 63 147 88m-128-104c64 70 89 63 147 81"/></g>
          <path d="M-20 568c83-30 190-35 271-62s106-50 93-91-53-76-64-125" fill="none" stroke="#f6f0d4" stroke-width="12"/>
          <path d="M-20 568c83-30 190-35 271-62s106-50 93-91-53-76-64-125" fill="none" stroke="#a4b2a1" stroke-width="6"/>
          <path d="M15 707c107-68 242-53 346-59 131-8 105-62 194-83l99-22" fill="none" stroke="#eee9ce" stroke-width="17"/>
          <path d="M15 707c107-68 242-53 346-59 131-8 105-62 194-83l99-22" fill="none" stroke="#a4b2a1" stroke-width="9"/>
          <path d="M809 319c-66-27-111-69-101-94 8-21 38 5 61-1 39-9 57-22 43-42l-39-34" fill="none" stroke="#f3edd2" stroke-width="12"/><path d="M809 319c-66-27-111-69-101-94 8-21 38 5 61-1 39-9 57-22 43-42l-39-34" fill="none" stroke="#aab7a3" stroke-width="6"/>
          ${tree(126, 364, .65, '#8bae75')}${tree(162, 390, .85, '#7f9f68')}${tree(187, 357, .7, '#88aa70')}${tree(382, 564, .65, '#7d9f68')}${tree(423, 591, .9, '#8bad75')}${tree(460, 577, .65, '#7d9f68')}${tree(982, 414, .75, '#82a46d')}${tree(1023, 436, .9, '#89ac73')}${tree(1049, 403, .65, '#82a46d')}${tree(570, 139, .55, '#a3bc80')}${tree(603, 158, .7, '#8cab74')}
          <g transform="translate(192 70)"><text class="jl-map-sea-label">Büyük Bay</text><path d="M-10 23q14-8 28 0t28 0t28 0" stroke="#d8eef0" stroke-width="2" fill="none"/></g>
          <g transform="translate(677 78)"><path d="M-17 16h36l-7 11h-21Z" fill="#4e939b"/><path d="M0-23v37h-18Zm5 3L20 12H5Z" fill="#f9f5e0"/><path d="M0-28v44" stroke="#4e939b" stroke-width="2"/></g>
          <text x="690" y="116" class="jl-art-small" fill="#48797c">Büyük Liman</text>
          <a href="/future-work" class="jl-map-road" aria-label="Follow the blue road to future work"><path d="${road}" fill="none" stroke="transparent" stroke-width="56"/><path class="jl-road-outline" d="${road}" fill="none" stroke="#1873bb" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/><path class="jl-road-fill" d="${road}" fill="none" stroke="#2397e4" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/><path d="${road}" fill="none" stroke="#b4e2f4" stroke-opacity=".45" stroke-width="2" stroke-dasharray="2 20" stroke-linecap="round"/></a>
          <g transform="translate(811 320)"><circle r="29" fill="#ecf5df" opacity=".55" class="jl-waypoint-halo"/><circle r="19" fill="#2b94dc" stroke="#fffdf1" stroke-width="5"/><circle r="5" fill="#fffdf1"/></g>
          <g transform="translate(685 160)" filter="url(#jl-sign-shadow)"><rect width="246" height="47" rx="12" fill="#187fd4"/><path d="m107 46 13 13 13-13" fill="#187fd4"/><text x="123" y="30" text-anchor="middle" class="jl-map-road-label">Rumeli Feneri Cd.</text></g>
          <a href="/future-work" class="jl-map-stop jl-scene-link" aria-label="Future work, the next stop along the blue road"><g transform="translate(534 365)" filter="url(#jl-sign-shadow)"><path d="M37 18 7-18" stroke="#608064" stroke-width="4"/><rect x="23" width="202" height="70" rx="12" fill="#f8f4df" stroke="#bdcca1" stroke-width="1.5"/><circle cx="53" cy="35" r="14" fill="#e5bd69"/><path d="M53 26v10l6 4" fill="none" stroke="#655734" stroke-width="2" stroke-linecap="round"/><text x="79" y="30" class="jl-map-stop-title">The next turn</text><text x="79" y="51" class="jl-map-stop-small">Future work · in progress</text></g></a>
          <a href="/games" class="jl-board-sign jl-scene-link" aria-label="Kuzey Marmara board games, play now"><g transform="translate(100 438)" filter="url(#jl-sign-shadow)"><path d="M22 58v107m221-107v107" stroke="#f7edce" stroke-width="9"/><rect width="266" height="99" rx="9" fill="#225c49" stroke="#f2efd8" stroke-width="5"/><rect x="9" y="9" width="248" height="81" rx="4" fill="none" stroke="#a4c0a1" stroke-width="1"/><text x="133" y="39" text-anchor="middle" class="jl-board-title">Kuzey Marmara</text><text x="133" y="66" text-anchor="middle" class="jl-board-sub">BOARD GAMES &amp; PLAY</text><g transform="translate(115 117) rotate(-10)"><rect width="35" height="35" rx="7" fill="#f4ecd0" stroke="#507c58" stroke-width="2"/><g fill="#4c7051"><circle cx="10" cy="10" r="2.3"/><circle cx="25" cy="10" r="2.3"/><circle cx="17.5" cy="17.5" r="2.3"/><circle cx="10" cy="25" r="2.3"/><circle cx="25" cy="25" r="2.3"/></g></g></g></a>
          <a href="/cloud" class="jl-map-cloud jl-scene-link" aria-label="Open the cloud next-step page"><g transform="translate(970 77)">${cloud(0, 0, 1.25)}<text x="5" y="7" text-anchor="middle" class="jl-cloud-label">Cloud lab</text><circle cx="36" cy="50" r="8" fill="#fcfbee"/><circle cx="21" cy="71" r="5" fill="#fcfbee"/></g></a>
          <g transform="translate(50 633)" opacity=".75"><circle r="23" fill="#f4f1d5"/><path d="m-9 9 5-14 13-4-5 14Z" fill="#406949"/><circle r="2" fill="#f4f1d5"/></g>
          <text x="90" y="640" class="jl-art-small" fill="#42684b">WANDER WITH PURPOSE</text>
        </g>
      </svg>
      <figcaption class="jl-map-caption"><span><i class="jl-dot"></i> A map for ideas, inspired by Rumeli Feneri.</span><span>Choose any marked destination.</span></figcaption>
    </figure>
    <nav class="jl-destinations" aria-label="Linkers destinations"><a href="/future-work"><span class="jl-destination-icon jl-blue">${routeIcon}</span><div><strong>Follow the blue road</strong><span>Find out what comes next.</span></div><span class="jl-destination-number">01</span></a><a href="/cloud"><span class="jl-destination-icon">${tinyCloud}</span><div><strong>Head into the clouds</strong><span>Prepare a cloud experiment.</span></div><span class="jl-destination-number">02</span></a><a href="/games"><span class="jl-destination-icon jl-gold">${dieIcon}</span><div><strong>Stop at Kuzey Marmara</strong><span>Take a break. Play a game.</span></div><span class="jl-destination-number">03</span></a></nav>
  </section>`;
}

export function renderCloud(main) {
  prepare(main, 'Cloud lab');
  main.innerHTML = `<section class="jl-world jl-cloud-page">
    <div class="jl-subpage-top">${backLink('/linkers', 'Back to Linkers')}<span class="jl-status-pill">NEXT-STEP PREVIEW</span></div>
    <div class="jl-cloud-hero"><div class="jl-cloud-copy"><p class="jl-eyebrow">THE NEXT HORIZON</p><h1>A little higher.<br><em>A little further.</em></h1><p>Bring your data, choose a workflow, and imagine the experiments you could run together.</p><div class="jl-cloud-actions"><a href="/federated" class="jl-action">Prepare an experiment</a><a href="/datasets" class="jl-quiet-action">Explore datasets</a></div><p class="jl-availability"><span></span>Cloud execution is planned. Configuration tools are ready.</p></div><div class="jl-cloud-illustration"><svg viewBox="0 0 500 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A research station floating on a cloud"><defs><radialGradient id="jl-cloud-sky"><stop stop-color="#bad6ce"/><stop offset="1" stop-color="#edf0dc" stop-opacity="0"/></radialGradient></defs><circle cx="260" cy="226" r="210" fill="url(#jl-cloud-sky)"/>${sun(350, 92, 36)}<g class="jl-floating-cloud"><path d="M108 355c-86 0-98-111-23-137 0-66 90-92 132-43 67-20 112 17 114 63 74-13 118 45 81 88-12 14-26 29-63 29Z" fill="#fffdf2" stroke="#c8d9bf" stroke-width="2"/><path d="m166 206 85-31 85 31-85 31Z" fill="#88a88e"/><path d="M166 206v74l85 31v-74Z" fill="#a5c6a3"/><path d="m251 237 85-31v74l-85 31Z" fill="#71967c"/><path d="M189 219v50l40 15v-50Z" fill="#f5f0d7"/><path d="m267 244 46-17v10l-46 17Zm0 23 46-17v10l-46 17Z" fill="#c2dab6"/><path d="M249 176v-61m-7 0h14" stroke="#497460" stroke-width="5"/><circle cx="249" cy="104" r="10" fill="#e1ad66"/><path d="M225 108a28 28 0 0 1 12-26m37 26a28 28 0 0 0-12-26" fill="none" stroke="#709b81" stroke-width="2"/><path d="m195 145 16 8m96 1 17-12" stroke="#a5bca2" stroke-width="2"/><g transform="translate(129 301)"><path d="M0-13v31m-13-18h26" stroke="#aac19f" stroke-width="2"/><circle r="6" fill="#efd193"/></g></g>${cloud(91, 117, .5)}${cloud(408, 310, .46)}<path d="M196 379v25m50-28v48m50-41v17" stroke="#a8c4aa" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 9"/></svg></div></div>
    <section class="jl-cloud-steps" aria-label="Prepare a cloud experiment"><article><span>01</span><h2>Bring a dataset</h2><p>Explore the included teaching volumes or save a private NIfTI collection.</p><a href="/datasets">Open the data library</a></article><article><span>02</span><h2>Shape an experiment</h2><p>Choose your datasets, client count, and aggregation strategy. Export a configuration.</p><a href="/federated">Visit the federated lab</a></article><article><span>03</span><h2>Connect the compute</h2><p>Running models and coordinating remote training is the next integration.</p><span class="jl-planned-label">PLANNED</span></article></section>
    <div class="jl-cloud-note">Your route is ready to plan. A cloud provider and training service have not been connected yet.</div>
  </section>`;
}

export function renderFuture(main) {
  prepare(main, 'The next turn');
  main.innerHTML = `<section class="jl-world jl-future-page"><div class="jl-subpage-top">${backLink('/linkers', 'Back to Linkers')}<span class="jl-status-pill">FUTURE WORK</span></div><div class="jl-future-layout"><div class="jl-future-illustration"><svg viewBox="0 0 540 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A winding blue road leads to a future research destination"><defs><clipPath id="jl-future-clip"><path d="M25 435V198a245 190 0 0 1 490 0v237Z"/></clipPath></defs><g clip-path="url(#jl-future-clip)"><rect width="540" height="460" fill="#d8e7db"/>${sun(391, 102, 35)}${cloud(129, 93, .65)}<path d="M0 269c88-115 185-28 252-84 118-95 212 14 288 16v259H0Z" fill="#c2d3a2"/><path d="M0 344c118-70 198 12 287-58 89-71 151-31 253 5v169H0Z" fill="#9ebc8c"/><path d="M188 478c3-76 200-47 194-111-5-47-204-11-205-53-1-27 110-35 96-74" fill="none" stroke="#edf0d2" stroke-width="37"/><path d="M188 478c3-76 200-47 194-111-5-47-204-11-205-53-1-27 110-35 96-74" fill="none" stroke="#3d91c3" stroke-width="18"/>${tree(91, 305, .8)}${tree(125, 323, .6)}${tree(434, 341, .85)}${tree(406, 318, .6)}<g transform="translate(219 212)"><path d="M10 15v50m100-50v50" stroke="#685f43" stroke-width="6"/><rect y="1" width="120" height="33" rx="4" fill="#f0d6a1" stroke="#947c4e" stroke-width="2"/><path d="m9 2 22 31M43 2l22 31M77 2l22 31" stroke="#bf8052" stroke-width="14"/><circle cx="60" cy="-17" r="12" fill="#eab266" stroke="#947c4e" stroke-width="2"/></g></g></svg></div><div class="jl-future-copy"><p class="jl-eyebrow">YOU FOUND THE NEXT TURN</p><h1>This path is still<br><em>taking shape.</em></h1><p>The blue road leads to the next chapter of the research workspace. This destination is a planned stop, ready for new ideas.</p><div class="jl-future-status"><span class="jl-dot"></span><div><strong>Work in progress</strong><span>Cloud execution and more connected experiments.</span></div></div><div class="jl-cloud-actions"><a href="/games" class="jl-action">Play at Kuzey Marmara</a><a href="/cloud" class="jl-quiet-action">Explore the cloud lab</a></div></div></div><div class="jl-future-foot"><span>Good ideas take a few turns.</span><a href="/research">Explore the research journal</a><a href="/admin">Private owner workspace</a></div></section>`;
}
