# Homepage Refactor Plan

## Issues Identified
1. Task directory sidebar and quadrant sections have inconsistent styling with the rest of the app
2. Quadrant size is affected by task directory width (should be independent)
3. World news details display inline at the end instead of in a modal

## Design Solutions

### 1. Task Directory Sidebar Improvements
- **Current**: Basic glass panel with minimal styling
- **New**: Enhanced glass morphism with consistent border radius, shadows, and spacing
- **Changes**:
  - Unified border-radius (1.5rem) matching other panels
  - Enhanced backdrop-filter and shadow system
  - Improved task card hover states with subtle animations
  - Better visual hierarchy with refined typography

### 2. Quadrant Layout Independence
- **Current**: Quadrant is in flex layout affected by sidebar width
- **New**: Absolute positioning with fixed calculations
- **Changes**:
  - Use CSS Grid for main layout instead of flex
  - Quadrant takes full available space minus fixed sidebar width
  - Responsive breakpoints for mobile/tablet/desktop
  - Smooth transitions when sidebar toggles

### 3. World News Modal
- **Current**: Details show inline at bottom of news list
- **New**: Overlay modal with backdrop blur
- **Changes**:
  - Full-screen modal overlay with backdrop
  - Centered modal panel with max-width
  - Close button and ESC key support
  - Smooth enter/exit animations
  - Scroll lock when modal is open

## Implementation Steps

1. Update CSS variables for consistent spacing/sizing
2. Refactor main layout to use CSS Grid
3. Create WorldNewsModal component
4. Update task directory styling
5. Add responsive breakpoints
6. Test all interactions and animations
