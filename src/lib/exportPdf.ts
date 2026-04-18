import html2canvas from 'html2canvas';

export async function exportScheduleAsImage(
  element: HTMLElement,
  monthLabel: string
): Promise<void> {
  // Scroll element into view so nothing is off-screen
  element.scrollIntoView({ behavior: 'instant', block: 'start' });
  await new Promise(r => setTimeout(r, 100)); // brief pause for layout settle

  const fullWidth = element.scrollWidth;
  const fullHeight = element.scrollHeight;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    // Use the element's full scroll dimensions so the right edge is never clipped
    width: fullWidth,
    height: fullHeight,
    windowWidth: fullWidth,
    windowHeight: fullHeight,
    onclone: (_doc, clonedEl) => {
      // Ensure the cloned root element is wide enough and nothing clips on the right
      clonedEl.style.width = fullWidth + 'px';
      clonedEl.style.overflow = 'visible';
    },
  });

  const link = document.createElement('a');
  link.download = `ตารางเวร-${monthLabel.replace(/\s/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
