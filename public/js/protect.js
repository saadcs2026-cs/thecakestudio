// Simple Protection
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
  if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
  if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) e.preventDefault();
  if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) e.preventDefault();
  if (e.ctrlKey && (e.key === 'S' || e.key === 's')) e.preventDefault();
});
