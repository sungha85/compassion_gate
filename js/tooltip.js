// ===== Tooltip (요소 중심 고정, top/bottom 자동 플립) =====
(function setupTooltip(){
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);

  let activeEl = null;

  function placeTipFor(el){
    if(!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 10;       // 화면 모서리 여백
    const gap = 10;          // 요소와 툴팁 간격

    // 먼저 가운데 정렬로 놓고 크기 측정
    tip.style.left = `${rect.left + rect.width/2}px`;
    tip.style.top  = `${rect.top - gap}px`;
    tip.style.transform = 'translate(-50%, -100%)'; // 위쪽 기준
    tip.dataset.pos = 'top';

    // 레이아웃 계산 후 화면 밖이면 아래쪽으로 플립
    const r = tip.getBoundingClientRect();
    if(r.top < margin){
      tip.style.top = `${rect.bottom + gap}px`;
      tip.style.transform = 'translate(-50%, 0)';   // 아래쪽 기준
      tip.dataset.pos = 'bottom';
    }

    // 좌우도 화면 밖이면 살짝 안쪽으로 보정
    const r2 = tip.getBoundingClientRect();
    let left = r2.left, right = r2.right, vw = window.innerWidth;
    let dx = 0;
    if(left < margin) dx = margin - left;
    else if(right > vw - margin) dx = (vw - margin) - right;
    if(dx !== 0){
      const currentLeft = parseFloat(tip.style.left);
      tip.style.left = `${currentLeft + dx}px`;
    }
  }

  function showTip(el){
    const text = el.getAttribute('data-tooltip');
    if(!text) return;
    activeEl = el;
    tip.textContent = text;
    tip.dataset.show = 'true';
    tip.setAttribute('aria-hidden', 'false');
    placeTipFor(el);
  }

  function hideTip(){
    activeEl = null;
    tip.dataset.show = 'false';
    tip.setAttribute('aria-hidden', 'true');
  }

  // 이벤트 위임: 마우스
  document.addEventListener('mouseover', e=>{
    const el = e.target.closest('[data-tooltip]');
    if(!el) return;
    showTip(el);
  });
  document.addEventListener('mouseout', e=>{
    if(activeEl && !e.relatedTarget?.closest('[data-tooltip]')) hideTip();
  });

  // 키보드 접근성
  document.addEventListener('focusin', e=>{
    const el = e.target.closest('[data-tooltip]');
    if(!el) return;
    showTip(el);
  });
  document.addEventListener('focusout', e=>{
    if(e.target.closest('[data-tooltip]')) hideTip();
  });

  // 리사이즈/스크롤 시 위치 재계산
  ['scroll','resize'].forEach(type=>{
    window.addEventListener(type, ()=>{
      if(activeEl && tip.dataset.show === 'true') placeTipFor(activeEl);
    }, { passive:true });
  });
})();
