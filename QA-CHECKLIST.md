# QA checklist

## Automated
- [x] `node docs/money.test.js`
- [x] `node docs/storage.test.js`
- [ ] Manual browser console clean on load

## Manual — desktop (Chrome/Edge/Firefox)
- [ ] Overview, Today, Week, Month, Money, Backup routes load
- [ ] Refresh keeps data
- [ ] Backup download + restore with confirm
- [ ] Invalid backup rejected
- [ ] Money stretch math matches available − set aside − unpaid − spends
- [ ] Expected paycheck does **not** inflate stretch unless opt-in checked
- [ ] Keyboard tab order / focus visible
- [ ] `prefers-reduced-motion` does not break layout

## Manual — mobile (~375px)
- [ ] No horizontal overflow
- [ ] Section select works
- [ ] Quick capture usable
- [ ] Bill/spend forms usable

## Offline / PWA
- [ ] SW registers on https/localhost
- [ ] After first visit, reload offline still serves shell (if supported)
- [ ] Do not claim file:// install works

## Editions
- [ ] Demo shows banner + caps
- [ ] Full package `data-edition=full` has no demo banner
