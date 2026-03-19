# Component Usage Guide

## Task Directory Sidebar

### HTML Structure
```tsx
<motion.div className="task-directory-panel">
  <div className="task-directory-card">
    {/* Card content */}
  </div>
  <div className="task-directory-card task-directory-card-active">
    {/* Active card content */}
  </div>
</motion.div>
```

### CSS Classes

#### `.task-directory-panel`
Main sidebar container with glass morphism effect.

**Properties:**
- Background: Gradient with transparency
- Border: Right border with accent color
- Backdrop-filter: blur(16px)
- Shadow: Inset glow + outer shadow

**Usage:**
```tsx
<motion.div className="task-directory-panel">
  {/* Sidebar content */}
</motion.div>
```

#### `.task-directory-card`
Individual task card in the directory.

**Properties:**
- Background: Gradient glass effect
- Border: Subtle with transparency
- Border-radius: 1.25rem
- Padding: 1rem
- Transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1)

**States:**
- Default: Subtle appearance
- Hover: Lifts up 2px, enhanced shadow
- Active: Accent color background

**Usage:**
```tsx
<div className={cn(
  "task-directory-card",
  isActive && "task-directory-card-active"
)}>
  {/* Card content */}
</div>
```

## World News Modal

### HTML Structure
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      className="world-news-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        className="world-news-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### CSS Classes

#### `.world-news-modal-backdrop`
Full-screen overlay with blur effect.

**Properties:**
- Position: fixed
- Inset: 0 (covers entire viewport)
- Background: Semi-transparent with blur
- Backdrop-filter: blur(8px)
- Display: flex (for centering)
- Align-items: center
- Justify-content: center
- Z-index: 40

**Animation:**
```css
@keyframes modal-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Usage:**
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="world-news-modal-backdrop"
  onClick={handleClose}
>
  {/* Modal panel */}
</motion.div>
```

#### `.world-news-modal-panel`
The actual modal content container.

**Properties:**
- Background: Enhanced glass gradient
- Border: Accent color with transparency
- Border-radius: 1.75rem
- Backdrop-filter: blur(20px)
- Max-height: 90vh
- Max-width: 3xl (48rem)
- Display: flex
- Flex-direction: column
- Overflow: hidden

**Animation:**
```css
@keyframes modal-panel-in {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

**Usage:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.92, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.92, y: 20 }}
  className="world-news-modal-panel"
  onClick={(e) => e.stopPropagation()}
>
  {/* Modal content */}
</motion.div>
```

## React Hooks for Modal

### ESC Key Handler
```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, [isOpen, onClose]);
```

### Body Scroll Lock
```tsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);
```

## Theme-Specific Styling

### Applying Theme Overrides
All components automatically adapt to the current theme through CSS variables and theme-specific selectors.

```css
/* Night theme (default) */
.task-directory-panel { /* ... */ }

/* Day theme */
[data-theme="day"] .task-directory-panel { /* ... */ }

/* Stardew theme */
[data-theme="stardew"] .task-directory-panel { /* ... */ }

/* Starlit theme */
[data-theme="starlit"] .task-directory-panel { /* ... */ }
```

### Setting Theme
```tsx
// In your component
const [theme, setTheme] = useState<'night' | 'day' | 'stardew' | 'starlit'>('night');

useEffect(() => {
  document.documentElement.dataset.theme = theme;
}, [theme]);
```

## Animation Timing

### Recommended Durations
```tsx
// Modal backdrop
duration: 0.2 // 200ms

// Modal panel
duration: 0.25 // 250ms

// Task card hover
transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)"

// Sidebar width change
transition: "width 300ms ease-out"
```

### Easing Functions
```tsx
// Spring effect (modal)
ease: [0.34, 1.56, 0.64, 1]

// Smooth ease (cards)
ease: "easeOut"

// Standard (backdrop)
ease: "linear"
```

## Responsive Behavior

### Mobile (<768px)
```tsx
// Modal takes full width with padding
className="w-full max-w-3xl p-4"

// Sidebar collapses by default
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
```

### Tablet (768px - 1024px)
```tsx
// Modal has fixed width
className="w-full md:w-[30rem]"

// Sidebar can be toggled
const [isSidebarOpen, setIsSidebarOpen] = useState(true);
```

### Desktop (>1024px)
```tsx
// Modal centered with max-width
className="w-full max-w-3xl"

// Sidebar always visible
const [isSidebarOpen, setIsSidebarOpen] = useState(true);
```

## Common Patterns

### Opening Modal
```tsx
const openModal = (item: Item) => {
  setSelectedItem(item);
  setIsModalOpen(true);
};
```

### Closing Modal
```tsx
const closeModal = () => {
  setIsModalOpen(false);
  setSelectedItem(null);
};
```

### Toggle Sidebar
```tsx
const toggleSidebar = () => {
  setIsSidebarOpen(prev => !prev);
};
```

### Conditional Rendering
```tsx
<AnimatePresence>
  {isModalOpen && (
    <Modal onClose={closeModal}>
      {/* Content */}
    </Modal>
  )}
</AnimatePresence>
```

## Accessibility Checklist

- [ ] Modal has `role="dialog"`
- [ ] Modal has `aria-modal="true"`
- [ ] Modal has `aria-labelledby` pointing to title
- [ ] Close button has `aria-label="Close"`
- [ ] ESC key closes modal ✅
- [ ] Click outside closes modal ✅
- [ ] Focus moves to modal when opened
- [ ] Focus returns to trigger when closed
- [ ] Focus is trapped within modal
- [ ] Tab navigation works correctly

## Performance Tips

1. **Use CSS transforms** for animations (GPU-accelerated)
2. **Avoid animating** width, height, top, left
3. **Use will-change** sparingly and only when needed
4. **Debounce** resize handlers
5. **Memoize** expensive calculations
6. **Use React.memo** for static components
7. **Lazy load** modal content if heavy

## Debugging

### Check Theme
```tsx
console.log(document.documentElement.dataset.theme);
```

### Check Modal State
```tsx
console.log({
  isOpen,
  selectedItem,
  bodyOverflow: document.body.style.overflow
});
```

### Check Animations
```tsx
// In browser DevTools
// Elements → Animations panel
// Shows all running animations
```

## Common Issues

### Modal not centering
**Solution:** Ensure backdrop has `display: flex` and centering properties.

### Backdrop not blurring
**Solution:** Check browser support for `backdrop-filter`. Add fallback.

### ESC key not working
**Solution:** Verify event listener is attached and dependency array is correct.

### Body scroll not locking
**Solution:** Check if `overflow: hidden` is being applied to `body` element.

### Theme not applying
**Solution:** Verify `data-theme` attribute is set on `<html>` element.
