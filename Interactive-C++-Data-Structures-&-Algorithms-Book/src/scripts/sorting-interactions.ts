import '../styles/sorting.css';

// Part VI owns array-row navigation and auxiliary panels. Playback and generic
// inspection retain their accepted semantics for Chapters 1–36.
export function bindSorting(root: HTMLElement): void {
  root.classList.add('sorting-lab');
  const canvas = root.querySelector<HTMLElement>('[data-svg]')!;
  const mobile = root.querySelector<HTMLElement>('[data-mobile-code]');
  if (mobile) mobile.tabIndex = 0;
  let lastStep = root.dataset.step;
  function pinLabels(): void {
    const svg=canvas.querySelector<SVGSVGElement>('svg');
    if(!svg) return;
    const scale=svg.viewBox.baseVal.width/svg.getBoundingClientRect().width;
    const x=28+canvas.scrollLeft*scale, columns=Math.max(18,Math.floor((canvas.clientWidth*scale-56)/7.3));
    for(const label of svg.querySelectorAll<SVGTextElement>('[data-sort-label]')) {
      const lines:string[]=[''];
      for(const word of label.dataset.sortLabel!.split(' ')) {
        const i=lines.length-1;
        if(lines[i]!.length+word.length+1>columns&&lines[i])lines.push(word);
        else lines[i]+=(lines[i]?' ':'')+word;
      }
      label.replaceChildren(...lines.map((line,i)=>{
        const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');
        span.setAttribute('x',String(x));span.setAttribute('dy',i?'14':'0');span.textContent=line;return span;
      }));
    }
  }
  function reveal(target: Element): void {
    const box = target.getBoundingClientRect(), viewport = canvas.getBoundingClientRect();
    if(box.left < viewport.left || box.right > viewport.right) canvas.scrollLeft += box.left + box.width/2 - viewport.left - viewport.width/2;
  }
  function panels(): void {
    for (const selector of ['.sorting-state-strip', '.sorting-facts']) {
      const panel = canvas.querySelector<HTMLElement>(`:scope > ${selector}`);
      if (!panel) continue;
      canvas.parentElement!.querySelector(`:scope > ${selector}`)?.remove();
      if(selector === '.sorting-state-strip') canvas.before(panel); else canvas.after(panel);
    }
    if(root.dataset.step !== lastStep) {
      lastStep=root.dataset.step;
      const active=canvas.querySelector('[data-sort-storage] .sort-active');
      if(active) reveal(active);
      else if(lastStep==='0') canvas.scrollLeft=0;
    }
    pinLabels();
  }
  panels();
  new MutationObserver(panels).observe(canvas, {childList:true});
  canvas.addEventListener('scroll',pinLabels,{passive:true});
  new ResizeObserver(pinLabels).observe(canvas);
  root.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const target = event.target as HTMLElement;
    if (!target.matches('[data-sort-index]')) return;
    event.preventDefault();
    const peers = [...canvas.querySelectorAll<HTMLElement>('[data-sort-index]')].filter(e => e.dataset.sortRow === target.dataset.sortRow);
    const index = peers.indexOf(target);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? peers.length-1 : Math.max(0,Math.min(peers.length-1,index+(event.key === 'ArrowLeft' ? -1 : 1)));
    peers[next]?.focus({preventScroll:true});
  });
  root.addEventListener('focusin', event => {
    const target = event.target as HTMLElement;
    if(!target.matches('[data-sort-index]')) return;
    reveal(target);
  });
}
