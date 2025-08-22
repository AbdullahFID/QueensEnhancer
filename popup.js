(() => {
  const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
                  /Mac OS|iOS/.test(navigator.userAgent);
  const keys = document.getElementById('keys');

  const chip = (txt) => `<span class="kbd">${txt}</span>`;
  const combo = isApple
    ? `${chip('Ctrl')} + ${chip('⇧ Shift')} + ${chip('Q')}`
    : `${chip('Ctrl')} + ${chip('Shift')} + ${chip('Q')}`;

  keys.innerHTML = combo;
})();
