import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PanelStory } from '@/components/axis/panel-story';
import { setScene } from '@/components/axis/scene/store';

const scene = vi.hoisted(() => ({ enabled: true, mobile: false, ready: true }));
vi.mock('@/components/axis/scene/store', () => ({ useSceneState: () => scene, setScene: vi.fn() }));
vi.mock('@/components/axis/glass', () => ({ GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
let intersect: (entries: { intersectionRatio: number }[]) => void;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const visibility = (ratio: number) => act(() => intersect([{ intersectionRatio: ratio }]));

beforeEach(() => {
  scene.enabled = true; scene.mobile = false; scene.ready = true;
  vi.useFakeTimers(); vi.mocked(setScene).mockClear();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {} disconnect() {}
  });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('shows every benefit immediately and never captures scrolling', () => {
  render(<PanelStory />);
  expect(screen.getByText('Detail up close.')).toBeVisible();
  expect(screen.getByText('Made to be serviced.')).toBeVisible();
  expect(screen.getByText('Sized for your stage.')).toBeVisible();
  expect(fireEvent.wheel(window, { deltaY: 4000 })).toBe(true);
  expect(fireEvent.keyDown(window, { key: 'PageDown' })).toBe(true);
  expect(fireEvent.touchMove(window, { touches: [{ clientY: 20 }] })).toBe(true);
  fireEvent.scroll(window);
  expect(setScene).not.toHaveBeenCalled();
  expect(window.scrollTo).not.toHaveBeenCalled();
});
it('plays one visible introduction, reassembles, and does not loop on reentry', () => {
  render(<PanelStory />); visibility(0.2); advance(6000);
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 0 }));
  vi.mocked(setScene).mockClear();
  visibility(0.7); advance(6000);
  expect(vi.mocked(setScene).mock.calls.map(([patch]) => patch.step)).toEqual([0, 3, 4, 0]);
  visibility(0); vi.mocked(setScene).mockClear(); visibility(1); advance(6000);
  expect(setScene).not.toHaveBeenCalled();
});
it('manual exploration cancels automatic changes and replay still works', () => {
  render(<PanelStory />); visibility(1); advance(600);
  fireEvent.click(screen.getByRole('button', { name: 'See the pixels' }));
  advance(6000);
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 1 }));
  expect(screen.getByRole('button', { name: 'See the pixels' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Explore the layers' }));
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 4 }));
  fireEvent.click(screen.getByRole('button', { name: 'Replay overview' }));
  advance(2000);
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 4 }));
  advance(4000);
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 0 }));
});
it('cancels pending poses when scrolled away or unmounted', () => {
  const view = render(<PanelStory />); visibility(1); advance(600); visibility(0);
  vi.mocked(setScene).mockClear(); advance(6000);
  expect(setScene).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Replay overview' }));
  view.unmount(); vi.mocked(setScene).mockClear(); advance(6000);
  expect(setScene).not.toHaveBeenCalled();
});
it('waits for the 3D scene to load before starting', () => {
  scene.ready = false; const view = render(<PanelStory />); advance(6000);
  expect(setScene).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Replay overview' })).toBeDisabled();
  scene.ready = true; view.rerender(<PanelStory />); visibility(1); advance(600);
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 3 }));
});
it('keeps the same benefits and optional controls on mobile', () => {
  scene.mobile = true; render(<PanelStory />);
  expect(screen.getByText('Sized for your stage.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'View the back' }));
  expect(setScene).toHaveBeenLastCalledWith(expect.objectContaining({ step: 3 }));
  expect(fireEvent.touchMove(window, { touches: [{ clientY: 20 }] })).toBe(true);
});
it('shows the benefits without animation for reduced motion or unavailable WebGL', () => {
  scene.enabled = false; render(<PanelStory />);
  expect(screen.getByText('Made to be serviced.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Replay overview' })).not.toBeInTheDocument();
  expect(setScene).not.toHaveBeenCalled();
});
