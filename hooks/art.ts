// The astronaut, drawn as one SVG. Every state is the same drawing with
// different classes on the root: st-<mood>, v-<tool> and a-<alternate>. CSS
// shows that state's props and plays its animation, so nothing here needs a
// script. Coordinates inside the rig are centered on the astronaut's
// shoulders: the helmet sits around (0,-26), the shoulders pivot at (+-18,7)
// and an arm reaches 26 units to the glove.
import type { Buddy, MissionTask, Mood } from '../types'
import { lineFor } from './lines'

// How many versions each mood has. Moods not listed have one.
export const ALTS: Partial<Record<Mood, number>> = { idle: 7, think: 5, done: 4, err: 4, sleep: 2, ask: 2 }
// The versions picked at random. Done's fourth version, fireworks, is kept
// for turns that ran a long time.
export const RANDOM_ALTS: Partial<Record<Mood, number>> = { ...ALTS, done: 3 }
// The idle version where the astronaut pats the alien pal.
export const ALIEN_ALT = 4

// The version a state shows, kept in range.
function altOf(b: Buddy): number {
  return Math.max(0, Math.min((ALTS[b.mood] ?? 1) - 1, b.alt ?? 0))
}

// What the astronaut is doing, as words: "is welding a hull panel". The line
// comes from that state's pool (lines.ts), picked by the roll made when the
// state began.
function doingOf(b: Buddy, alien: string): string {
  return lineFor(b.mood, b.tool, altOf(b), b.say ?? 0, alien)
}

// The mission readout: how many tasks are done, and the one under way (or
// the next one up). Null while there is no task list.
export function missionOf(tasks: readonly MissionTask[] | undefined): { done: number; total: number; current: string | null } | null {
  if (!tasks || tasks.length === 0) return null
  const done = tasks.filter(t => t.status === 'completed').length
  const active = tasks.find(t => t.status === 'in_progress')
  const next = tasks.find(t => t.status === 'pending')
  const current = active ? active.activeForm || active.subject : next ? next.subject : null
  return { done, total: tasks.length, current }
}

const percent = (share: number) => Math.round(Math.max(0, Math.min(1, share)) * 100)

// The readouts as one line of text, for the terminal and for screen readers:
// "Comet is welding · memory 62% free · fuel 58% · mission 3/7 · main, 2 uncommitted".
export function describe(b: Buddy, name: string, alien: string): string {
  const parts = [`${name} ${doingOf(b, alien)}`]
  if (b.o2 !== null) parts.push(`memory ${percent(b.o2)}% free`)
  if (b.fuel) parts.push(`fuel ${percent(b.fuel.left)}%`)
  const mission = missionOf(b.tasks)
  if (mission) parts.push(`mission ${mission.done}/${mission.total}`)
  if (b.ship) parts.push(`${b.ship.branch}, ${uncommitted(b.ship.changed)}`)
  return parts.join(' · ')
}

function uncommitted(changed: number): string {
  return changed === 0 ? 'all committed' : `${changed} uncommitted`
}

// Below this much free context the antenna light turns red and blinks.
const LOW_O2 = 0.2

// Oxygen gauge on the chest: the share of the context window still free.
function gauge(o2: number | null): string {
  const left = o2 === null ? 1 : Math.max(0, Math.min(1, o2))
  const color = left > 0.5 ? '#5DCAA5' : left > LOW_O2 ? '#EF9F27' : '#E24B4A'
  return `<rect class="o2g" x="-8" y="15" width="${(16 * left).toFixed(1)}" height="5" rx="1" fill="${color}"/>`
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}

// Every prop starts hidden; a state's rules below show the ones it uses.
const HIDDEN = [
  'b-think', 'b-tool', 'b-wait', 'b-done', 'b-err', 'b-agents', 'b-ask', 'b-compact', 'b-abort',
  'zz', 'closed', 'happy', 'squint', 'meh', 'wscr', 'smoke', 'spks', 'laptop', 'plate', 'sparks',
  'torch', 'vtint', 'pick', 'rockg', 'dish', 'radio', 'sig', 'clipb', 'flag', 'flask', 'crate',
  'jet', 'sign', 'drones', 'canister', 'refill', 'sweat', 'glass', 'tgt', 'jug', 'boop', 'bulb',
  'book', 'confetti', 'notes', 'flyw', 'b-long', 'b-wake', 'map', 'cam', 'snap', 'rover', 'ctrl',
  'logb', 'pen', 'mailr', 'bag', 'blocks', 'alien', 'const', 'rod', 'board', 'holo', 'fw', 'dizzy', 'dz',
  'sbag', 'cap', 'aeh',
].map(c => '.' + c).join(',')

// The arms, head, body and sway turn around fixed points in their own
// coordinates (the shoulders, the neck, the middle of the body), so a long
// prop in a hand can never shift where a part pivots.
const STYLE = `
.ant{animation:tw 1.6s ease-in-out infinite}
.tw{animation:tw 3s ease-in-out infinite}
.armL,.armR{transform-box:view-box;transform-origin:0 0;transition:transform .4s}
.head{transform-box:view-box;transform-origin:0 2px;transition:transform .4s}
.sway{transform-box:view-box;transform-origin:18px -10px;animation:sway 6s ease-in-out infinite}
.flip{transform-box:view-box;transform-origin:0 -12px}
.rig{animation:bob 4s ease-in-out infinite}
.eyes{transition:transform .4s}
.eyes ellipse{transform-box:fill-box;transform-origin:center;animation:blink 4.5s infinite}
.gear,.spk,.rock,.orb,.cf,.flyw g,.wrap{transform-box:fill-box;transform-origin:center}
.lid{transform-box:fill-box;transform-origin:0% 100%}
.fwave,.pan{transform-box:fill-box;transform-origin:0% 50%}
.refill{transform-box:fill-box;transform-origin:0% 50%}
.pg{transform-box:fill-box;transform-origin:0% 50%}
.jet path{transform-box:fill-box;transform-origin:50% 0%}
.whl,.bg,.hg,.mer,.burst,.orb2,.flash,.snapc{transform-box:fill-box;transform-origin:center}
.legR{transform-box:fill-box;transform-origin:50% 0%}
.al{transform-box:fill-box;transform-origin:50% 100%}
.band .atag{display:none}.heart{transform-box:fill-box;transform-origin:center}
${HIDDEN}{opacity:0;transition:opacity .3s}
.low .ant{fill:#E24B4A;animation:tw .5s infinite}.low .sweat{opacity:1;animation:drip 2.4s infinite}

.st-hello .enter{animation:flyin 1.6s cubic-bezier(.2,.8,.3,1) both}.st-hello .jet{opacity:1;animation:jetoff 2.2s forwards}.st-hello .jet path{animation:flick .2s infinite}.st-hello .eyes{opacity:0}.st-hello .happy{opacity:1}.st-hello .armR{animation:hiwave .5s ease-in-out 1.4s infinite}

.st-idle.a-0 .armR{animation:wave 9s ease-in-out infinite}
.st-idle.a-1 .glass,.st-idle.a-1 .tgt{opacity:1}.st-idle.a-1 .armR{transform:rotate(-150deg)}.st-idle.a-1 .eyes{transform:translate(3px,-1px)}.st-idle.a-1 .pan{animation:pan 4s ease-in-out infinite}.st-idle.a-1 .tgt path{animation:pulse 1.4s infinite}
.st-idle.a-2 .jug{opacity:1}.st-idle.a-2 .pl{animation:jug 3s linear infinite}.st-idle.a-2 .armL{animation:jugL .75s ease-in-out infinite}.st-idle.a-2 .armR{animation:jugR .75s ease-in-out infinite}.st-idle.a-2 .eyes{transform:translate(0,-3px)}
.st-idle.a-3 .boop{opacity:1}.st-idle.a-3 .boop>g{animation:boop 8s ease-in-out infinite}.st-idle.a-3 .armR{animation:poke 8s ease-in-out infinite}.st-idle.a-3 .eyes{animation:follow 8s ease-in-out infinite}

.st-think .b-think{opacity:1}.st-think .b-think .d{animation:dot 1.2s infinite}
.st-think.a-0 .armL{animation:rub 1.6s ease-in-out infinite}.st-think.a-0 .head{transform:rotate(-6deg)}.st-think.a-0 .eyes{animation:look 4s ease-in-out infinite}
.st-think.a-1 .bulb{opacity:1}.st-think.a-1 .lit{animation:lit 3.2s infinite}.st-think.a-1 .rays{animation:rays 3.2s infinite}.st-think.a-1 .armR{animation:aha 3.2s ease-in-out infinite}.st-think.a-1 .eyes{transform:translate(-2px,-3px)}
.st-think.a-2 .book{opacity:1}.st-think.a-2 .pg{animation:pageflip 3s ease-in-out infinite}.st-think.a-2 .armL{animation:readbob 3s ease-in-out infinite}.st-think.a-2 .eyes{transform:translate(-3px,0)}.st-think.a-2 .head{transform:rotate(-4deg)}

.st-tool .b-tool{opacity:1}.st-tool .gear{animation:spin 1.5s linear infinite}
.st-tool.v-wrist .armR{transform:rotate(50deg)}.st-tool.v-wrist .eyes{transform:translate(-2px,3px)}.st-tool.v-wrist .wscr{opacity:1;animation:flk .4s steps(2) infinite}
.st-tool.v-laptop .armR{animation:type .2s ease-in-out infinite}.st-tool.v-laptop .eyes{transform:translate(3px,1px)}.st-tool.v-laptop .laptop{opacity:1}.st-tool.v-laptop .code rect{animation:code 1.2s steps(1) infinite}
.st-tool.v-weld .armR{animation:jig .15s infinite}.st-tool.v-weld .eyes{transform:translate(3px,1px)}.st-tool.v-weld .plate,.st-tool.v-weld .sparks,.st-tool.v-weld .torch{opacity:1}.st-tool.v-weld .vtint{animation:vt .12s infinite}.st-tool.v-weld .arc{animation:arc .12s infinite}.st-tool.v-weld .seam{stroke-dasharray:22;animation:seam 2.4s linear infinite}.st-tool.v-weld .fall{animation:fall .75s linear infinite}.st-tool.v-weld .f2{animation-name:fall2}.st-tool.v-weld .f3{animation-name:fall3}
.st-tool.v-mine .armR{animation:swing 1.1s ease-in infinite}.st-tool.v-mine .eyes{transform:translate(3px,1px)}.st-tool.v-mine .pick,.st-tool.v-mine .rockg{opacity:1}.st-tool.v-mine .rock{animation:hit 1.1s infinite}.st-tool.v-mine .chip{animation:chip 1.1s ease-out infinite}.st-tool.v-mine .c2{animation-name:chip2}.st-tool.v-mine .c3{animation-name:chip3}
.st-tool.v-web .dish{opacity:1}.st-tool.v-web .armR{animation:scan 2.4s ease-in-out infinite}.st-tool.v-web .eyes{transform:translate(3px,-3px)}.st-tool.v-web .wv{animation:wv 1.2s infinite}
.st-tool.v-radio .radio,.st-tool.v-radio .sig{opacity:1}.st-tool.v-radio .armR{transform:rotate(-150deg)}.st-tool.v-radio .head{transform:rotate(5deg)}.st-tool.v-radio .eyes{transform:translate(3px,0)}.st-tool.v-radio .led{animation:arc .4s steps(2) infinite}.st-tool.v-radio .sig rect{animation:wv 1.2s infinite}
.st-tool.v-list .clipb{opacity:1}.st-tool.v-list .armL{animation:listbob 2s ease-in-out infinite}.st-tool.v-list .eyes{transform:translate(-3px,1px)}.st-tool.v-list .t1{animation:tk1 3s infinite}.st-tool.v-list .t2{animation:tk2 3s infinite}.st-tool.v-list .t3{animation:tk3 3s infinite}
.st-tool.v-flag .flag{opacity:1}.st-tool.v-flag .armR{transform:rotate(-125deg)}.st-tool.v-flag .eyes{opacity:0}.st-tool.v-flag .happy{opacity:1}.st-tool.v-flag .fwave{animation:fwave .6s ease-in-out infinite}
.st-tool.v-lab .flask{opacity:1}.st-tool.v-lab .armR{animation:swirl 1.2s ease-in-out infinite}.st-tool.v-lab .eyes{transform:translate(3px,-2px)}.st-tool.v-lab .bub{animation:bubup 1.2s infinite}
.st-tool.v-crate .crate{opacity:1}.st-tool.v-crate .armR{transform:rotate(-80deg)}.st-tool.v-crate .eyes{transform:translate(3px,1px)}.st-tool.v-crate .lid{animation:lidop 2s ease-in-out infinite}.st-tool.v-crate .cube{animation:cube 2.4s ease-out infinite}

.st-agents .drones,.st-agents .b-agents{opacity:1}.st-agents .orb{animation:orbit 6s linear infinite}.st-agents .dl{animation:arc .5s infinite}.st-agents .armR{transform:rotate(50deg)}.st-agents .wscr{opacity:1;animation:flk .4s steps(2) infinite}.st-agents .eyes{animation:look 4s ease-in-out infinite}
.st-ask .b-ask{opacity:1}.st-ask.a-0 .sign{opacity:1}.st-ask.a-0 .armL{animation:hold 1.8s ease-in-out infinite}.st-ask.a-0 .eyes{transform:translate(-3px,-3px)}.st-ask.a-0 .head{transform:rotate(-4deg)}
.st-ask.a-1 .armR{animation:raise 1s ease-in-out infinite}.st-ask.a-1 .eyes{transform:translate(2px,-3px)}
.st-wait .armR{animation:frR .34s ease-in-out infinite}.st-wait .armL{animation:frL .34s ease-in-out infinite;animation-delay:-.17s}.st-wait .flip{animation:jit .34s ease-in-out infinite}.st-wait .b-wait{opacity:1;animation:pulse .6s infinite}
.st-compact .canister,.st-compact .b-compact{opacity:1}.st-compact .refill{opacity:1;animation:refill 2.2s ease-in-out infinite}.st-compact .can{animation:cbob 2s ease-in-out infinite}.st-compact .armR{transform:rotate(-60deg)}.st-compact .eyes{transform:translate(0,3px)}.st-compact .head{transform:rotate(4deg)}

.st-done .eyes{opacity:0}.st-done .happy,.st-done .b-done{opacity:1}
.st-done.a-0 .armL{transform:rotate(150deg)}.st-done.a-0 .armR{transform:rotate(-150deg)}.st-done.a-0 .flip{animation:flip 3s ease-in-out infinite}.st-done.a-0 .spks{opacity:1}.st-done.a-0 .spk{animation:spark 1.5s infinite}
.st-done.a-1 .armR{animation:pump .5s ease-in-out infinite}.st-done.a-1 .confetti{opacity:1}.st-done.a-1 .cf{animation:cf1 2.2s linear infinite}.st-done.a-1 .cf.k2{animation-name:cf2}
.st-done.a-2 .flip{animation:wig .5s ease-in-out infinite}.st-done.a-2 .armL{animation:dL 1s ease-in-out infinite}.st-done.a-2 .armR{animation:dR 1s ease-in-out infinite}.st-done.a-2 .notes{opacity:1}.st-done.a-2 .note{animation:noteup 2s ease-out infinite}

.st-abort .eyes{opacity:0}.st-abort .meh,.st-abort .b-abort{opacity:1}.st-abort .armL{animation:shrL 1.2s ease-in-out infinite}.st-abort .armR{animation:shrR 1.2s ease-in-out infinite}.st-abort .head{transform:rotate(8deg)}.st-abort .flip{animation:shrug 1.2s ease-in-out infinite}

.st-err .b-err{opacity:1}
.st-err.a-0 .eyes{opacity:0}.st-err.a-0 .squint{opacity:1}.st-err.a-0 .flip{animation:jolt 2.4s ease-out infinite}.st-err.a-0 .smoke{opacity:1}.st-err.a-0 .smoke circle{animation:puff 1.6s ease-out infinite}
.st-err.a-1 .flyw{opacity:1}.st-err.a-1 .flyw g{animation:drift 2.4s ease-out infinite}.st-err.a-1 .armR{animation:reach 2.4s ease-out infinite}.st-err.a-1 .eyes{transform:translate(3px,-1px)}

.st-sleep .eyes{opacity:0}.st-sleep .closed{opacity:1}.st-sleep .rig{animation-duration:8s}.st-sleep .sway{animation:none;transform:rotate(-12deg)}.st-sleep .zz{opacity:1}.st-sleep .zz path{animation:rise 3s infinite}

.st-wake .b-wake{opacity:1}.st-wake .armL{animation:strL 2.2s ease-in-out both}.st-wake .armR{animation:strR 2.2s ease-in-out both}.st-wake .eyes{animation:wopen 2.2s both}.st-wake .closed{animation:wclose 2.2s both}.st-wake .flip{animation:lean 2.2s ease-in-out both}

.st-tool.v-long .b-tool{opacity:0}.st-tool.v-long .b-long{opacity:1}.st-tool.v-long .hg{animation:hgflip 2s ease-in-out infinite}.st-tool.v-long .armR{transform:rotate(60deg)}.st-tool.v-long .wscr{opacity:1}.st-tool.v-long .eyes{transform:translate(-3px,3px)}.st-tool.v-long .legR{animation:tap .4s ease-in-out infinite}.st-tool.v-long .head{animation:sigh 4s ease-in-out infinite}
.st-tool.v-map .map{opacity:1}.st-tool.v-map .armL{transform:rotate(50deg)}.st-tool.v-map .armR{transform:rotate(-50deg)}.st-tool.v-map .eyes{transform:translate(0,3px)}.st-tool.v-map .route{stroke-dasharray:56;animation:route 2.6s linear infinite}.st-tool.v-map .xmark{animation:pulse 1s infinite}
.st-tool.v-photo .cam,.st-tool.v-photo .snap{opacity:1}.st-tool.v-photo .armR{animation:shoot 2.4s ease-in-out infinite}.st-tool.v-photo .flash{animation:flash 2.4s infinite}.st-tool.v-photo .snapc{animation:snapc 2.4s ease-out infinite}.st-tool.v-photo .eyes{transform:translate(3px,0)}
.st-tool.v-rover .rover,.st-tool.v-rover .ctrl{opacity:1}.st-tool.v-rover .rv{animation:drive 2.4s ease-in-out infinite alternate}.st-tool.v-rover .whl{animation:spin .6s linear infinite}.st-tool.v-rover .armL{animation:joyL .3s ease-in-out infinite}.st-tool.v-rover .armR{animation:joyR .3s ease-in-out infinite;animation-delay:-.15s}.st-tool.v-rover .eyes{transform:translate(3px,2px)}
.st-tool.v-log .logb,.st-tool.v-log .pen{opacity:1}.st-tool.v-log .armL{transform:rotate(-25deg)}.st-tool.v-log .armR{animation:scrib .25s ease-in-out infinite}.st-tool.v-log .eyes{transform:translate(-1px,3px)}.st-tool.v-log .ln{stroke-dasharray:12;animation:write 3.2s linear infinite}.st-tool.v-log .l2{animation-delay:.8s}.st-tool.v-log .l3{animation-delay:1.6s}.st-tool.v-log .l4{animation-delay:2.4s}
.st-tool.v-mail .mailr{opacity:1}.st-tool.v-mail .mm{animation:launch 1.8s ease-in infinite}.st-tool.v-mail .armR{animation:send 1.8s ease-out infinite}.st-tool.v-mail .eyes{transform:translate(3px,-3px)}
.st-tool.v-trash .bag{opacity:1}.st-tool.v-trash .bg{animation:toss 2s ease-out infinite}.st-tool.v-trash .armR{animation:tossarm 2s ease-out infinite}.st-tool.v-trash .eyes{transform:translate(3px,1px)}
.st-tool.v-build .blocks{opacity:1}.st-tool.v-build .k1{animation:bk1 3.2s infinite}.st-tool.v-build .k2{animation:bk2 3.2s infinite}.st-tool.v-build .k3{animation:bk3 3.2s infinite}.st-tool.v-build .k4{animation:bk4 3.2s infinite}.st-tool.v-build .armR{animation:place .8s ease-in-out infinite}.st-tool.v-build .eyes{transform:translate(3px,2px)}

.st-idle.a-4 .alien{opacity:1}.st-idle.a-4 .armL{animation:pat .6s ease-in-out infinite}.st-idle.a-4 .al{animation:squish .6s ease-in-out infinite}.st-idle.a-4 .heart{animation:heart 2.4s ease-out infinite}.st-idle.a-4 .aeo{animation:aeo 2.4s infinite}.st-idle.a-4 .aeh{animation:aeh 2.4s infinite}.st-idle.a-4 .eyes{transform:translate(-3px,1px)}
.st-idle.a-5 .const{opacity:1}.st-idle.a-5 .cs{animation:csin 6s infinite}.st-idle.a-5 .s2{animation-delay:.7s}.st-idle.a-5 .s3{animation-delay:1.4s}.st-idle.a-5 .s4{animation-delay:2.1s}.st-idle.a-5 .s5{animation-delay:2.8s}.st-idle.a-5 .cline{stroke-dasharray:85;animation:cdraw 6s linear infinite}.st-idle.a-5 .armR{animation:point 3s ease-in-out infinite}.st-idle.a-5 .eyes{transform:translate(3px,-3px)}
.st-idle.a-6 .rod{opacity:1}.st-idle.a-6 .armR{animation:cast 2s ease-in-out infinite}.st-idle.a-6 .bait{animation:bob2 1.4s ease-in-out infinite}.st-idle.a-6 .eyes{transform:translate(3px,1px)}

.st-think.a-3 .board{opacity:1}.st-think.a-3 .ch{stroke-dasharray:20;animation:chalk 4s linear infinite}.st-think.a-3 .c2{animation-delay:.6s}.st-think.a-3 .c3{animation-delay:1.2s}.st-think.a-3 .c4{animation-delay:1.8s}.st-think.a-3 .c5{animation-delay:2.4s}.st-think.a-3 .armL{animation:chalkarm .3s ease-in-out infinite}.st-think.a-3 .eyes{transform:translate(-3px,-1px)}.st-think.a-3 .head{transform:rotate(-4deg)}
.st-think.a-4 .holo{opacity:1}.st-think.a-4 .mer{animation:mer 3s linear infinite}.st-think.a-4 .m2{animation-delay:-1.5s}.st-think.a-4 .beam{animation:arc 1.2s infinite}.st-think.a-4 .armL{transform:rotate(70deg)}.st-think.a-4 .eyes{transform:translate(-3px,-2px)}

.st-done.a-3 .armL{transform:rotate(150deg)}.st-done.a-3 .armR{transform:rotate(-150deg)}.st-done.a-3 .fw{opacity:1}.st-done.a-3 .burst{animation:burst 1.6s ease-out infinite}

.st-err.a-2 .eyes{opacity:0}.st-err.a-2 .dz,.st-err.a-2 .dizzy{opacity:1}.st-err.a-2 .orb2{animation:orbit 1.4s linear infinite}.st-err.a-2 .sway{animation:sway 1.2s ease-in-out infinite}
.st-err.a-3 .eyes{opacity:0}.st-err.a-3 .meh{opacity:1}.st-err.a-3 .armR{animation:palm 1s ease-in-out infinite}.st-err.a-3 .head{animation:noshake .8s ease-in-out infinite}

.st-sleep.a-1 .sbag,.st-sleep.a-1 .cap{opacity:1}

@keyframes strL{0%{transform:rotate(0)}40%,70%{transform:rotate(135deg)}100%{transform:rotate(0)}}
@keyframes strR{0%{transform:rotate(0)}40%,70%{transform:rotate(-135deg)}100%{transform:rotate(0)}}
@keyframes lean{0%,100%{transform:translateY(0)}40%,70%{transform:translateY(-3px)}}
@keyframes wopen{0%,70%{opacity:0}85%,100%{opacity:1}}
@keyframes wclose{0%,70%{opacity:1}85%,100%{opacity:0}}
@keyframes raise{0%,100%{transform:rotate(-150deg)}50%{transform:rotate(-132deg)}}
@keyframes hgflip{0%,70%{transform:rotate(0)}85%,100%{transform:rotate(180deg)}}
@keyframes tap{0%,100%{transform:rotate(0)}50%{transform:rotate(-14deg)}}
@keyframes sigh{0%,70%,100%{transform:rotate(0)}80%{transform:rotate(-6deg)}90%{transform:rotate(4deg)}}
@keyframes route{0%{stroke-dashoffset:56}80%,100%{stroke-dashoffset:0}}
@keyframes flash{0%,55%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1)}72%,100%{opacity:0;transform:scale(1.3)}}
@keyframes snapc{0%,62%{transform:translate(0,4px) rotate(0);opacity:0}68%{transform:translate(1px,-2px) rotate(3deg);opacity:1}90%{opacity:1}100%{transform:translate(9px,-20px) rotate(14deg);opacity:0}}
@keyframes shoot{0%,56%,72%,100%{transform:rotate(-120deg)}61%{transform:rotate(-114deg)}}
@keyframes drive{0%{transform:translateX(-14px)}100%{transform:translateX(14px)}}
@keyframes joyL{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(-25deg)}}
@keyframes joyR{0%,100%{transform:rotate(20deg)}50%{transform:rotate(25deg)}}
@keyframes scrib{0%,100%{transform:rotate(33deg)}50%{transform:rotate(39deg)}}
@keyframes write{0%{stroke-dashoffset:12}25%,90%{stroke-dashoffset:0}100%{stroke-dashoffset:12}}
@keyframes launch{0%{transform:translate(0,0);opacity:1}75%{transform:translate(70px,-70px);opacity:1}100%{transform:translate(84px,-84px);opacity:0}}
@keyframes send{0%{transform:rotate(-80deg)}15%,100%{transform:rotate(-125deg)}}
@keyframes toss{0%,15%{transform:translate(0,0) rotate(0);opacity:1}85%{transform:translate(70px,14px) rotate(260deg);opacity:1}100%{transform:translate(80px,16px) rotate(300deg);opacity:0}}
@keyframes tossarm{0%{transform:rotate(-20deg)}12%{transform:rotate(-12deg)}22%{transform:rotate(-95deg)}60%,100%{transform:rotate(-70deg)}}
@keyframes bk1{0%{transform:translateY(-6px);opacity:0}8%,92%{transform:translateY(0);opacity:1}100%{opacity:0}}
@keyframes bk2{0%,20%{transform:translateY(-6px);opacity:0}28%,92%{transform:translateY(0);opacity:1}100%{opacity:0}}
@keyframes bk3{0%,40%{transform:translateY(-6px);opacity:0}48%,92%{transform:translateY(0);opacity:1}100%{opacity:0}}
@keyframes bk4{0%,60%{transform:translateY(-6px);opacity:0}68%,92%{transform:translateY(0);opacity:1}100%{opacity:0}}
@keyframes place{0%,100%{transform:rotate(-62deg)}50%{transform:rotate(-78deg)}}
@keyframes pat{0%,100%{transform:rotate(76deg)}50%{transform:rotate(62deg)}}
@keyframes squish{0%,100%{transform:scale(1,1)}50%{transform:scale(1.08,.86)}}
@keyframes heart{0%,44%{transform:translate(0,0) scale(.5);opacity:0}54%{transform:translate(0,-3px) scale(1);opacity:1}100%{transform:translate(-2px,-14px) scale(1);opacity:0}}
@keyframes aeo{0%,42%{opacity:1}48%,94%{opacity:0}100%{opacity:1}}
@keyframes aeh{0%,42%{opacity:0}48%,94%{opacity:1}100%{opacity:0}}
@keyframes csin{0%{opacity:0}8%,85%{opacity:1}100%{opacity:0}}
@keyframes cdraw{0%,40%{stroke-dashoffset:85}75%,90%{stroke-dashoffset:0}100%{stroke-dashoffset:0;stroke-opacity:0}}
@keyframes point{0%,100%{transform:rotate(-140deg)}50%{transform:rotate(-128deg)}}
@keyframes cast{0%,100%{transform:rotate(-120deg)}50%{transform:rotate(-113deg)}}
@keyframes bob2{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}
@keyframes chalk{0%{stroke-dashoffset:20}20%,90%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}
@keyframes chalkarm{0%,100%{transform:rotate(110deg)}50%{transform:rotate(104deg)}}
@keyframes mer{0%{transform:scaleX(1)}50%{transform:scaleX(0)}100%{transform:scaleX(-1)}}
@keyframes burst{0%{transform:scale(.2);opacity:1}70%{opacity:1}100%{transform:scale(1.2);opacity:0}}
@keyframes palm{0%,100%{transform:rotate(148deg)}50%{transform:rotate(154deg)}}
@keyframes noshake{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes flyin{0%{transform:translate(-260px,30px)}100%{transform:translate(0,0)}}
@keyframes jetoff{0%,70%{opacity:1}100%{opacity:0}}
@keyframes flick{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.6)}}
@keyframes hiwave{0%,100%{transform:rotate(-150deg)}50%{transform:rotate(-115deg)}}
@keyframes wave{0%,72%,100%{transform:rotate(0)}78%{transform:rotate(-150deg)}82%{transform:rotate(-120deg)}86%{transform:rotate(-150deg)}92%{transform:rotate(0)}}
@keyframes pan{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes jug{0%{transform:translate(-36px,-10px)}12.5%{transform:translate(-30px,-52px)}25%{transform:translate(-12px,-76px)}37.5%{transform:translate(12px,-76px)}50%{transform:translate(30px,-52px)}62.5%{transform:translate(36px,-10px)}75%{transform:translate(12px,0)}87.5%{transform:translate(-12px,0)}100%{transform:translate(-36px,-10px)}}
@keyframes jugL{0%,100%{transform:rotate(125deg)}50%{transform:rotate(110deg)}}
@keyframes jugR{0%,100%{transform:rotate(-110deg)}50%{transform:rotate(-125deg)}}
@keyframes boop{0%{transform:translate(84px,-24px);opacity:1}28%{transform:translate(52px,-6px)}34%{transform:translate(64px,-36px)}62%{transform:translate(-30px,-66px)}84%{transform:translate(-70px,-14px);opacity:1}90%{transform:translate(-84px,0);opacity:0}96%{transform:translate(92px,-28px);opacity:0}100%{transform:translate(84px,-24px);opacity:1}}
@keyframes poke{0%,20%,44%,100%{transform:rotate(0)}29%{transform:rotate(-98deg)}34%{transform:rotate(-84deg)}}
@keyframes follow{0%,100%{transform:translate(3px,0)}28%{transform:translate(3px,1px)}62%{transform:translate(-1px,-3px)}84%{transform:translate(-3px,0)}}
@keyframes rub{0%,100%{transform:rotate(152deg)}50%{transform:rotate(140deg)}}
@keyframes look{0%,40%,100%{transform:translate(-3px,-3px)}50%,90%{transform:translate(2px,-3px)}}
@keyframes lit{0%,38%{opacity:0}42%{opacity:1}46%{opacity:0}50%{opacity:1}54%{opacity:.2}58%,92%{opacity:1}100%{opacity:0}}
@keyframes rays{0%,56%{opacity:0}60%,92%{opacity:1}100%{opacity:0}}
@keyframes aha{0%,55%,100%{transform:rotate(0)}62%,90%{transform:rotate(-165deg)}}
@keyframes readbob{0%,100%{transform:rotate(120deg)}50%{transform:rotate(114deg)}}
@keyframes swirl{0%,100%{transform:rotate(-120deg)}50%{transform:rotate(-112deg)}}
@keyframes pageflip{0%,60%{transform:scaleX(1)}80%{transform:scaleX(0)}100%{transform:scaleX(-1)}}
@keyframes flk{0%{opacity:1}100%{opacity:.55}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes type{0%,100%{transform:rotate(-40deg)}50%{transform:rotate(-31deg)}}
@keyframes code{0%{opacity:0}25%,100%{opacity:1}}
@keyframes jig{0%,100%{transform:rotate(-74deg)}50%{transform:rotate(-72deg)}}
@keyframes arc{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes vt{0%,100%{opacity:.45}50%{opacity:.3}}
@keyframes seam{from{stroke-dashoffset:22}to{stroke-dashoffset:0}}
@keyframes fall{0%{transform:translate(0,0);opacity:1}100%{transform:translate(5px,26px);opacity:0}}
@keyframes fall2{0%{transform:translate(0,0);opacity:1}100%{transform:translate(-4px,24px);opacity:0}}
@keyframes fall3{0%{transform:translate(0,0);opacity:1}100%{transform:translate(9px,18px);opacity:0}}
@keyframes swing{0%,100%{transform:rotate(-122deg)}40%{transform:rotate(-136deg)}55%{transform:rotate(-64deg)}65%{transform:rotate(-70deg)}}
@keyframes hit{0%,54%,72%,100%{transform:translate(0,0) rotate(0)}58%{transform:translate(3px,-1px) rotate(6deg)}64%{transform:translate(-1px,0) rotate(-3deg)}}
@keyframes chip{0%,54%{transform:translate(0,0);opacity:0}56%{opacity:1}85%,100%{transform:translate(-10px,10px);opacity:0}}
@keyframes chip2{0%,54%{transform:translate(0,0);opacity:0}56%{opacity:1}85%,100%{transform:translate(2px,16px);opacity:0}}
@keyframes chip3{0%,54%{transform:translate(0,0);opacity:0}56%{opacity:1}85%,100%{transform:translate(-14px,0);opacity:0}}
@keyframes scan{0%,100%{transform:rotate(-140deg)}50%{transform:rotate(-126deg)}}
@keyframes wv{0%,100%{opacity:.15}40%{opacity:1}}
@keyframes listbob{0%,100%{transform:rotate(70deg)}50%{transform:rotate(64deg)}}
@keyframes tk1{0%,15%{opacity:0}20%,95%{opacity:1}100%{opacity:0}}
@keyframes tk2{0%,45%{opacity:0}50%,95%{opacity:1}100%{opacity:0}}
@keyframes tk3{0%,75%{opacity:0}80%,95%{opacity:1}100%{opacity:0}}
@keyframes fwave{0%,100%{transform:skewY(0)}50%{transform:skewY(12deg)}}
@keyframes bubup{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(0,-14px);opacity:0}}
@keyframes lidop{0%,100%{transform:rotate(-28deg)}50%{transform:rotate(-52deg)}}
@keyframes cube{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(4px,-30px);opacity:0}}
@keyframes orbit{to{transform:rotate(360deg)}}
@keyframes hold{0%,100%{transform:rotate(150deg)}50%{transform:rotate(142deg)}}
@keyframes frR{0%,100%{transform:rotate(-150deg)}50%{transform:rotate(-108deg)}}
@keyframes frL{0%,100%{transform:rotate(150deg)}50%{transform:rotate(108deg)}}
@keyframes jit{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes refill{0%{transform:scaleX(0)}85%,100%{transform:scaleX(1)}}
@keyframes cbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes dot{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes rise{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(10px,-26px);opacity:0}}
@keyframes drip{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(0,8px);opacity:0}}
@keyframes flip{0%{transform:rotate(0)}35%{transform:rotate(360deg)}100%{transform:rotate(360deg)}}
@keyframes pump{0%,100%{transform:rotate(-165deg)}50%{transform:rotate(-135deg)}}
@keyframes cf1{0%{transform:translate(0,0) rotate(0);opacity:1}85%{opacity:1}100%{transform:translate(10px,170px) rotate(320deg);opacity:0}}
@keyframes cf2{0%{transform:translate(0,0) rotate(0);opacity:1}85%{opacity:1}100%{transform:translate(-14px,170px) rotate(-300deg);opacity:0}}
@keyframes wig{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes dL{0%,100%{transform:rotate(150deg)}50%{transform:rotate(60deg)}}
@keyframes dR{0%,100%{transform:rotate(-60deg)}50%{transform:rotate(-150deg)}}
@keyframes noteup{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(6px,-24px);opacity:0}}
@keyframes shrL{0%,100%{transform:rotate(92deg)}50%{transform:rotate(108deg)}}
@keyframes shrR{0%,100%{transform:rotate(-92deg)}50%{transform:rotate(-108deg)}}
@keyframes shrug{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes jolt{0%,30%,100%{transform:rotate(0) translateX(0)}5%{transform:rotate(-16deg) translateX(-5px)}12%{transform:rotate(9deg)}19%{transform:rotate(-5deg)}25%{transform:rotate(2deg)}}
@keyframes puff{0%{transform:translate(0,0) scale(.4);opacity:.9}100%{transform:translate(-16px,-20px) scale(1.5);opacity:0}}
@keyframes drift{0%{transform:translate(0,0) rotate(0);opacity:1}80%{transform:translate(52px,-36px) rotate(420deg);opacity:1}100%{transform:translate(62px,-42px) rotate(500deg);opacity:0}}
@keyframes reach{0%{transform:rotate(-50deg)}40%,100%{transform:rotate(-92deg)}}
@keyframes spark{0%,100%{opacity:0;transform:scale(.3)}40%{opacity:1;transform:scale(1)}70%{opacity:0}}
`

const SUIT = 'fill="#EFECE6" stroke="#B9B3A7" stroke-width=".8"'
const STAR4 = 'l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5z'
const GLOVE = '<circle cx="0" cy="26" r="6" fill="#8A8F9C"/>'
const SLEEVE = `<rect x="-5.5" y="0" width="11" height="24" rx="5.5" ${SUIT}/>`
// Radio waves along an arm's direction, centered 40 units out.
const WAVES = `<g stroke="#5DCAA5" stroke-width="1.6" fill="none" stroke-linecap="round"><path class="wv" d="M-5.6 45.6 Q0 50.4 5.6 45.6"/><path class="wv" d="M-9.1 49.1 Q0 56.9 9.1 49.1" style="animation-delay:.2s"/><path class="wv" d="M-12.6 52.6 Q0 63.4 12.6 52.6" style="animation-delay:.4s"/></g>`

const BACKDROP = `<rect width="340" height="240" fill="#141B2D"/>
<g fill="#E6F1FB"><circle class="tw" cx="30" cy="28" r="1.4"/><circle class="tw" cx="88" cy="60" r="1" style="animation-delay:.8s"/><circle class="tw" cx="140" cy="22" r="1.6" style="animation-delay:1.6s"/><circle class="tw" cx="214" cy="40" r="1" style="animation-delay:.4s"/><circle class="tw" cx="300" cy="24" r="1.4" style="animation-delay:2.2s"/><circle class="tw" cx="318" cy="96" r="1" style="animation-delay:1.1s"/><circle class="tw" cx="48" cy="120" r="1.2" style="animation-delay:2.6s"/><circle class="tw" cx="22" cy="196" r="1" style="animation-delay:.2s"/><circle class="tw" cx="110" cy="214" r="1.4" style="animation-delay:1.9s"/><circle class="tw" cx="196" cy="226" r="1" style="animation-delay:.6s"/><circle class="tw" cx="262" cy="70" r="1.2" style="animation-delay:2.9s"/></g>
<circle cx="300" cy="212" r="44" fill="#2A3550"/><circle cx="286" cy="196" r="7" fill="#334063"/><circle cx="312" cy="226" r="5" fill="#334063"/>`

// Props that float beside the astronaut, behind the body.
// Props behind the body. The alien pal wears its name on a tag.
const sideProps = (alien: string) => `<g class="smoke" fill="#B4B2A9"><circle cx="-20" cy="0" r="6"/><circle cx="-20" cy="0" r="6" style="animation-delay:.5s"/><circle cx="-20" cy="0" r="6" style="animation-delay:1s"/></g>
<g class="spks" fill="#FAC775"><path class="spk" d="M-46 -40 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z"/><path class="spk" d="M48 2 ${STAR4}" style="animation-delay:.5s"/><path class="spk" d="M-40 26 ${STAR4}" style="animation-delay:1s"/></g>
<g class="plate" transform="translate(58,10)"><rect x="-8" y="-14" width="16" height="30" rx="2" fill="#5F5E5A"/><rect x="-6" y="-12" width="12" height="26" fill="#888780"/><line class="seam" x1="0" y1="-10" x2="0" y2="12" stroke="#EF9F27" stroke-width="2" stroke-linecap="round"/></g>
<g class="rockg" transform="translate(64,6)"><g class="rock"><path d="M-12 -6 L-5 -13 L6 -12 L13 -4 L12 7 L4 13 L-7 12 L-13 4 Z" fill="#6B5B4E"/><circle cx="-4" cy="-3" r="3" fill="#57493E"/><circle cx="5" cy="5" r="2.2" fill="#57493E"/><path d="M4 -7 l2 -2 l2 2 l-2 2z" fill="#EF9F27"/></g><g fill="#8C7A6B"><rect class="chip" x="-8" y="8" width="3" height="3"/><rect class="chip c2" x="-8" y="8" width="2.5" height="2.5"/><rect class="chip c3" x="-8" y="8" width="2" height="2"/></g></g>
<g class="crate" transform="translate(60,16)"><g fill="#85B7EB"><rect class="cube" x="-3" y="-10" width="5" height="5" rx="1"/><rect class="cube" x="2" y="-10" width="4" height="4" rx="1" fill="#5DCAA5" style="animation-delay:.8s"/><rect class="cube" x="-6" y="-10" width="4" height="4" rx="1" fill="#F0997B" style="animation-delay:1.6s"/></g><rect x="-12" y="-8" width="24" height="17" rx="1.5" fill="#BA7517" stroke="#854F0B" stroke-width=".8"/><line x1="-12" y1="0" x2="12" y2="0" stroke="#854F0B" stroke-width=".8"/><rect x="-3" y="-8" width="6" height="17" fill="#854F0B"/><rect class="lid" x="-13" y="-12" width="26" height="4" rx="1" fill="#EF9F27"/></g>
<g class="canister" transform="translate(52,4)"><path d="M0 12 C -2 30, -26 30, -42 20" stroke="#888780" stroke-width="2" fill="none"/><g class="can"><rect x="-7" y="-16" width="14" height="30" rx="6" fill="#85B7EB"/><rect x="-7" y="-4" width="14" height="5" fill="#E6F1FB"/><rect x="-3" y="-20" width="6" height="5" rx="1.5" fill="#378ADD"/></g></g>
<g class="tgt"><path d="M96 -50 ${STAR4}" fill="#FAC775"/></g>
<g class="blocks" transform="translate(58,36)"><rect class="bk k1" x="-7" y="-8" width="14" height="8" rx="1" fill="#85B7EB"/><rect class="bk k2" x="-6" y="-16" width="12" height="8" rx="1" fill="#F0997B"/><rect class="bk k3" x="-5" y="-24" width="10" height="8" rx="1" fill="#97C459"/><path class="bk k4" d="M-5 -24 L0 -33 L5 -24 Z" fill="#D85A30"/></g>
<g class="alien" transform="translate(-42,42)"><g class="al"><g stroke="#639922" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M-6 -18 Q-9 -23 -13.5 -23.5"/><path d="M6 -18 Q9 -23 13.5 -23.5"/></g><circle cx="-14.5" cy="-23.6" r="2" fill="#FAC775"/><circle cx="14.5" cy="-23.6" r="2" fill="#FAC775"/><ellipse cx="-5.5" cy="0.5" rx="3.4" ry="2" fill="#639922"/><ellipse cx="5.5" cy="0.5" rx="3.4" ry="2" fill="#639922"/><ellipse cx="-11" cy="-7" rx="2.2" ry="3.6" transform="rotate(25 -11 -7)" fill="#97C459" stroke="#639922" stroke-width=".8"/><ellipse cx="11" cy="-7" rx="2.2" ry="3.6" transform="rotate(-25 11 -7)" fill="#97C459" stroke="#639922" stroke-width=".8"/><path d="M-11 -3 C-12 -14 -7 -21 0 -21 C7 -21 12 -14 11 -3 Q11 0 8 0 H-8 Q-11 0 -11 -3 Z" fill="#97C459" stroke="#639922" stroke-width=".9"/><ellipse cx="0" cy="-3" rx="6" ry="2.8" fill="#C0DD97"/><path d="M-7.5 -14 q2 -4 6 -4.6" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/><g class="aeo"><ellipse cx="-4" cy="-12" rx="3" ry="3.5" fill="#F4F2ED"/><ellipse cx="4" cy="-12" rx="3" ry="3.5" fill="#F4F2ED"/><circle cx="-3.4" cy="-12.6" r="1.9" fill="#173404"/><circle cx="4.6" cy="-12.6" r="1.9" fill="#173404"/><circle cx="-4" cy="-13.4" r=".7" fill="#FFFFFF"/><circle cx="4" cy="-13.4" r=".7" fill="#FFFFFF"/></g><g class="aeh" stroke="#173404" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M-6.2 -11.5 q2.2 -2.8 4.4 0"/><path d="M1.8 -11.5 q2.2 -2.8 4.4 0"/></g><ellipse cx="-7.4" cy="-8" rx="1.7" ry="1" fill="#ED93B1" fill-opacity=".8"/><ellipse cx="7.4" cy="-8" rx="1.7" ry="1" fill="#ED93B1" fill-opacity=".8"/><path d="M-1.6 -7.6 q1.6 1.5 3.2 0" stroke="#27500A" stroke-width=".9" fill="none" stroke-linecap="round"/></g><g transform="translate(-13,-27)"><path class="heart" d="M0 -2.5 C-1.5 -5.5 -6 -4.5 -5.5 -1 C-5 1.5 -2 3 0 5 C2 3 5 1.5 5.5 -1 C6 -4.5 1.5 -5.5 0 -2.5 Z" fill="#ED93B1" stroke="#D4537E" stroke-width=".6"/></g><text class="atag" x="0" y="11" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="6.5" font-weight="600" letter-spacing=".2" fill="#C0DD97" stroke="#141B2D" stroke-width="2.2" paint-order="stroke">${escape(alien)}</text></g>
<g class="const"><g fill="#FAC775"><circle class="cs" cx="52" cy="-72" r="1.8"/><circle class="cs s2" cx="68" cy="-58" r="1.8"/><circle class="cs s3" cx="86" cy="-66" r="1.8"/><circle class="cs s4" cx="98" cy="-46" r="1.8"/><circle class="cs s5" cx="80" cy="-36" r="1.8"/></g><path class="cline" d="M52 -72 L68 -58 L86 -66 L98 -46 L80 -36" stroke="#FAC775" stroke-width="1" fill="none" stroke-opacity=".7"/></g>
<g class="board" transform="translate(-58,-18)"><rect x="-18" y="-13" width="36" height="26" rx="2" fill="#8C7A6B"/><rect x="-16" y="-11" width="32" height="22" fill="#27500A"/><g stroke="#EAF3DE" stroke-width="1.1" fill="none" stroke-linecap="round"><path class="ch" d="M-12 -6 q2 -3 4 0 t4 0"/><path class="ch c2" d="M-1 -6 h4 M1 -8 v4"/><path class="ch c3" d="M6 -8 q3 0 3 2 q0 2 -3 2 q3 0 3 2 q0 2 -3 2"/><path class="ch c4" d="M-12 4 h10 l-3 -2 M-2 4 l-3 2"/><path class="ch c5" d="M2 3 q4 -3 8 0 q-4 3 -8 0"/></g></g>
<g class="fw">${[[-46, -62, '#F0997B', 0], [-6, -94, '#85B7EB', 0.5], [72, -38, '#FAC775', 1]].map(([x, y, c, d]) => `<g transform="translate(${x},${y})"><g class="burst" style="animation-delay:${d}s"><path d="M0 -4 V-12 M0 4 V12 M-4 0 H-12 M4 0 H12 M3 -3 L8.5 -8.5 M-3 3 L-8.5 8.5 M3 3 L8.5 8.5 M-3 -3 L-8.5 -8.5" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/></g></g>`).join('')}</g>`

const HEAD = `<g transform="translate(0,2)"><g class="head">
<line x1="12" y1="-55" x2="17" y2="-66" stroke="#B9B3A7" stroke-width="1.5"/><circle class="ant" cx="17.5" cy="-67.5" r="3" fill="#EF9F27"/>
<circle cx="0" cy="-28" r="29" fill="#F4F2ED" stroke="#B9B3A7"/><rect x="-15" y="-4" width="30" height="6" rx="3" fill="#D85A30"/>
<rect x="-21" y="-43" width="42" height="29" rx="13" fill="#1E2A3A"/><path d="M-14 -36 q6 -5 14 -5" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<g class="eyes"><ellipse cx="-8" cy="-27" rx="3" ry="4.2" fill="#9FD8FF"/><ellipse cx="8" cy="-27" rx="3" ry="4.2" fill="#9FD8FF"/></g>
<g stroke="#9FD8FF" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"><g class="closed"><path d="M-11 -27 q3 2.5 6 0"/><path d="M5 -27 q3 2.5 6 0"/></g><g class="happy"><path d="M-11 -25 q3 -5 6 0"/><path d="M5 -25 q3 -5 6 0"/></g><g class="squint"><path d="M-11 -31 l5 3.5 l-5 3.5"/><path d="M11 -31 l-5 3.5 l5 3.5"/></g><g class="meh"><path d="M-11 -27 h6"/><path d="M5 -27 h6"/></g><g class="dz" stroke-width="1.4"><path d="M-11.5 -27 a3.5 3.5 0 1 1 3.5 3.5 a2 2 0 1 1 -2 -2"/><path d="M4.5 -27 a3.5 3.5 0 1 1 3.5 3.5 a2 2 0 1 1 -2 -2"/></g></g>
<rect class="vtint" x="-21" y="-43" width="42" height="29" rx="13" fill="#BA7517"/>
<g class="sweat"><path d="M25 -46 q4 6 0 9 q-4 -3 0 -9z" fill="#85B7EB"/></g>
<g class="cap"><path d="M-20 -49 Q-2 -66 20 -50 Q22 -60 34 -57 Q26 -72 2 -68 Q-14 -64 -20 -49 Z" fill="#534AB7"/><path d="M-12 -55 Q2 -64 16 -55" stroke="#AFA9EC" stroke-width="2" fill="none"/><circle cx="35" cy="-56" r="3.4" fill="#EEEDFE"/></g>
</g></g>`

const LAPTOP = `<g class="laptop" transform="translate(46,12)"><rect x="-16" y="-13" width="32" height="22" rx="2" fill="#444441"/><rect x="-14" y="-11" width="28" height="18" fill="#1A2333"/><g class="code"><rect x="-12" y="-8" width="16" height="2.4" fill="#5DCAA5"/><rect x="-9" y="-4" width="12" height="2.4" fill="#85B7EB" style="animation-delay:.3s"/><rect x="-9" y="0" width="18" height="2.4" fill="#5DCAA5" style="animation-delay:.6s"/><rect x="-12" y="4" width="8" height="2.4" fill="#FAC775" style="animation-delay:.9s"/></g><path d="M-16 9 L16 9 L21 14 L-11 14 Z" fill="#5F5E5A"/></g>`

const SPARKS = `<g class="sparks" transform="translate(51,14)"><g fill="#FAC775"><circle class="fall" r="1.6"/><circle class="fall" r="1.2" style="animation-delay:.12s"/><circle class="fall f2" r="1.5" style="animation-delay:.25s"/><circle class="fall f2" r="1.2" style="animation-delay:.37s"/><circle class="fall f3" r="1.6" style="animation-delay:.5s"/><circle class="fall f3" r="1.1" style="animation-delay:.62s"/></g></g>`

// An open book held in front, for reading while thinking.
// An open book, held up beside the helmet for reading while thinking. Drawn
// centered on its spine; the left arm carries it.
const BOOK = `<g class="book"><g transform="translate(0,36) rotate(-120)"><rect x="-17" y="-10.5" width="34" height="21" rx="1.5" fill="#993C1D"/><path d="M0 -9.5 Q-8 -11.5 -16 -9.5 V9 Q-8 7 0 9 Z" fill="#F4F2ED" stroke="#B9B3A7" stroke-width=".6"/><path d="M0 -9.5 Q8 -11.5 16 -9.5 V9 Q8 7 0 9 Z" fill="#F4F2ED" stroke="#B9B3A7" stroke-width=".6"/><g stroke="#B4B2A9" stroke-width=".8"><line x1="-13" y1="-5" x2="-3" y2="-5"/><line x1="-13" y1="-1" x2="-3" y2="-1"/><line x1="-13" y1="3" x2="-5" y2="3"/><line x1="3" y1="-5" x2="13" y2="-5"/><line x1="3" y1="-1" x2="13" y2="-1"/></g><path class="pg" d="M0 -9.5 Q8 -11.5 16 -9.5 V9 Q8 7 0 9 Z" fill="#FAFAF7" stroke="#B9B3A7" stroke-width=".6"/></g></g>`

// A spyglass held up to the visor, for idle stargazing.
const GLASS = `<g class="glass" transform="translate(20,-20) rotate(-15)"><g class="pan"><rect x="0" y="-3" width="14" height="6" rx="1.5" fill="#B4B2A9"/><rect x="13" y="-4" width="12" height="8" rx="1.5" fill="#888780"/><rect x="24" y="-5" width="4" height="10" rx="1" fill="#5F5E5A"/></g></g>`


// Held in both hands in front of the body: the plan-mode star chart, the
// captain's log and the rover's remote.
const MAP = `<g class="map"><rect x="-36" y="22" width="72" height="26" rx="2" fill="#FAEEDA" stroke="#BA7517" stroke-width=".8"/><g fill="#854F0B"><circle cx="-26" cy="30" r="1.2"/><circle cx="-12" cy="40" r="1.2"/><circle cx="6" cy="28" r="1.2"/><circle cx="20" cy="38" r="1.2"/><circle cx="-30" cy="42" r=".8"/><circle cx="12" cy="44" r=".8"/></g><path class="route" d="M-26 30 L-12 40 L6 28 L20 38" stroke="#D85A30" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path class="xmark" d="M24 29 l5 5 M29 29 l-5 5" stroke="#D85A30" stroke-width="1.8" stroke-linecap="round"/><rect x="-40" y="20" width="5" height="30" rx="2.5" fill="#EF9F27"/><rect x="35" y="20" width="5" height="30" rx="2.5" fill="#EF9F27"/></g>`
const LOGB = `<g class="logb"><rect x="-13" y="22" width="20" height="25" rx="1.5" fill="#3B6D11"/><rect x="-11" y="24" width="16" height="21" fill="#F4F2ED"/><g stroke="#5F5E5A" stroke-width="1" stroke-linecap="round"><path class="ln" d="M-9 28 h12"/><path class="ln l2" d="M-9 32 h12"/><path class="ln l3" d="M-9 36 h12"/><path class="ln l4" d="M-9 40 h8"/></g></g>`
const CTRL = `<g class="ctrl"><line x1="7" y1="25" x2="10" y2="16" stroke="#888780" stroke-width="1.2"/><circle class="dl" cx="10" cy="15.5" r="1.3" fill="#5DCAA5"/><rect x="-10" y="24" width="20" height="9" rx="3" fill="#444441"/><circle cx="-4" cy="28.5" r="1.6" fill="#E24B4A"/><circle cx="4" cy="28.5" r="1.6" fill="#5DCAA5"/></g>`
// A sleeping bag drawn over the body, for the second way of dozing off.
const SBAG = `<g class="sbag"><rect x="-27" y="-2" width="54" height="56" rx="14" fill="#7F77DD"/><rect x="-27" y="-2" width="54" height="10" rx="5" fill="#AFA9EC"/><line x1="10" y1="9" x2="10" y2="48" stroke="#534AB7" stroke-width="1" stroke-dasharray="2 2"/></g>`

const JET = `<g class="jet"><path d="M-8 36 L0 58 L8 36 Z" fill="#EF9F27"/><path d="M-4 36 L0 48 L4 36 Z" fill="#FAC775"/></g>`

// Left arm: a question sign on a stick, or the task list clipboard. Both are
// turned back upright against the arm's angle.
const ARM_L = `<g transform="translate(-18,7)"><g class="armL">
<g class="sign"><rect x="-1.2" y="22" width="2.4" height="38" fill="#8C7A6B"/><g transform="translate(0,70) rotate(-150)"><rect x="-14" y="-10" width="28" height="20" rx="2" fill="#F4F2ED" stroke="#B9B3A7"/><path d="M-3.5 -4 q0 -4 3.5 -4 q3.5 0 3.5 3.2 q0 2.2 -3.5 3.3 v2.2" stroke="#185FA5" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0" cy="5.5" r="1.4" fill="#185FA5"/></g></g>
<g class="clipb"><g transform="translate(0,40) rotate(-70)"><rect x="-11" y="-14" width="22" height="28" rx="2" fill="#D3D1C7"/><rect x="-5" y="-16" width="10" height="4" rx="1" fill="#888780"/><g fill="none" stroke="#5F5E5A" stroke-width=".9"><rect x="-8" y="-8" width="4" height="4"/><rect x="-8" y="-1" width="4" height="4"/><rect x="-8" y="6" width="4" height="4"/></g><g stroke="#888780" stroke-width="1.2"><line x1="-2" y1="-6" x2="7" y2="-6"/><line x1="-2" y1="1" x2="6" y2="1"/><line x1="-2" y1="8" x2="7" y2="8"/></g><g stroke="#3B6D11" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="t1" d="M-8.5 -6.5 l1.8 2 l3.4 -4"/><path class="t2" d="M-8.5 0.5 l1.8 2 l3.4 -4"/><path class="t3" d="M-8.5 7.5 l1.8 2 l3.4 -4"/></g></g></g>
${BOOK}${SLEEVE}${GLOVE}</g></g>`

// Right arm: carries whichever tool is out.
const ARM_R = `<g transform="translate(18,7)"><g class="armR">
<g class="torch"><rect x="-2.5" y="28" width="5" height="10" rx="1.5" fill="#5F5E5A"/><circle class="arc" cx="0" cy="40" r="7" fill="#FAC775" fill-opacity=".35"/><circle class="arc" cx="0" cy="40" r="3.2" fill="#FFF3C4"/></g>
<g class="pick"><rect x="-1.5" y="24" width="3" height="22" rx="1" fill="#8C7A6B"/><path d="M-11 42 Q0 50 11 42 L11 45 Q0 54 -11 45 Z" fill="#B4B2A9"/></g>
<g class="dish"><rect x="-1.5" y="26" width="3" height="7" fill="#888780"/><path d="M-9 37 Q0 27 9 37 Z" fill="#B4B2A9"/><line x1="0" y1="32" x2="0" y2="40" stroke="#888780" stroke-width="1.4"/><circle cx="0" cy="40.5" r="1.4" fill="#EF9F27"/>${WAVES}</g>
<g class="radio"><rect x="-4" y="22" width="8" height="13" rx="2" fill="#444441"/><rect x="-2.5" y="25" width="5" height="3" fill="#5DCAA5"/><line x1="2" y1="35" x2="2" y2="44" stroke="#888780" stroke-width="1.4"/><circle class="led" cx="2" cy="45" r="1.5" fill="#E24B4A"/></g>
<g class="flag"><rect x="-1.2" y="22" width="2.4" height="46" fill="#B4B2A9"/><g transform="translate(0,66) rotate(125)"><g class="fwave"><path d="M0 0 h18 l-4 6 l4 6 h-18 z" fill="#D85A30"/><path d="M6 3.5 ${'l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1z'}" fill="#F4F2ED"/></g></g></g>
<g class="pen"><rect x="-1" y="25" width="2" height="13" rx="1" fill="#378ADD"/></g>
<g class="rod"><rect x="-1" y="22" width="2" height="44" fill="#8C7A6B"/><g transform="translate(0,66) rotate(120)"><line x1="0" y1="0" x2="0" y2="32" stroke="#D3D1C7" stroke-width=".7"/><g class="bait"><path d="M0 32 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5z" fill="#FAC775"/></g></g></g>
<g class="flask"><g transform="translate(0,38) rotate(120) scale(1.25)"><path d="M-3 -11 h6 v6 l6 11 a2 2 0 0 1 -2 3 h-14 a2 2 0 0 1 -2 -3 l6 -11 z" fill="#E6F1FB" fill-opacity=".35" stroke="#B5D4F4"/><path d="M-6 2 h12 l2.6 4.4 a2 2 0 0 1 -2 3 h-13.2 a2 2 0 0 1 -2 -3 z" fill="#97C459"/><g fill="#C0DD97"><circle class="bub" cx="-1" cy="4" r="1.2"/><circle class="bub" cx="2" cy="5" r="1" style="animation-delay:.4s"/><circle class="bub" cx="0" cy="6" r=".9" style="animation-delay:.8s"/></g></g></g>
${SLEEVE}<rect class="wscr" x="-4.5" y="12" width="9" height="8" rx="1.5" fill="#5DCAA5"/>${GLOVE}
<g class="cam"><g transform="translate(0,26) rotate(120)"><path d="M-4.5 -10 L-3 -13.5 H4 L5.5 -10 Z" fill="#888780"/><rect x="-11" y="-10.5" width="22" height="14" rx="2.5" fill="#D3D1C7" stroke="#5F5E5A" stroke-width=".8"/><rect x="-11" y="-3" width="22" height="2" fill="#B4B2A9"/><circle cx="1" cy="-3.5" r="5.6" fill="#5F5E5A"/><circle cx="1" cy="-3.5" r="3.8" fill="#1A2333"/><circle cx="-0.3" cy="-4.9" r="1.1" fill="#85B7EB"/><rect x="-9.5" y="-9" width="4.5" height="2.6" rx=".6" fill="#FAEEDA"/><rect x="6" y="-12" width="3.4" height="1.6" rx=".5" fill="#D85A30"/><g transform="translate(-7.2,-7.7)"><g class="flash"><circle r="4.5" fill="#FFFFFF"/><g stroke="#FFF3C4" stroke-width="1.6" stroke-linecap="round"><line x1="0" y1="-6.5" x2="0" y2="-11"/><line x1="0" y1="6.5" x2="0" y2="11"/><line x1="-6.5" y1="0" x2="-11" y2="0"/><line x1="6.5" y1="0" x2="11" y2="0"/><line x1="4.6" y1="-4.6" x2="7.8" y2="-7.8"/><line x1="-4.6" y1="-4.6" x2="-7.8" y2="-7.8"/><line x1="4.6" y1="4.6" x2="7.8" y2="7.8"/><line x1="-4.6" y1="4.6" x2="-7.8" y2="7.8"/></g></g></g></g></g>
</g></g>`

// Things that float in front of the astronaut.
const FRONT_PROPS = `<g class="drones">${[0, -2, -4].map(d => `<g class="orb" style="animation-delay:${d}s"><circle r="66" fill="transparent"/><g transform="translate(58,0)"><rect x="-6" y="-3" width="12" height="6" rx="2" fill="#D3D1C7"/><rect x="-8" y="-6" width="5" height="1.5" fill="#888780"/><rect x="3" y="-6" width="5" height="1.5" fill="#888780"/><circle class="dl" r="1.6" fill="#5DCAA5"/></g></g>`).join('')}</g>
<g class="sig" fill="#5DCAA5"><rect x="46" y="-34" width="3" height="4"/><rect x="51" y="-37" width="3" height="7" style="animation-delay:.2s"/><rect x="56" y="-40" width="3" height="10" style="animation-delay:.4s"/></g>
<g class="jug"><g class="pl"><circle r="3.5" fill="#F0997B"/></g><g class="pl" style="animation-delay:-1s"><circle r="4" fill="#85B7EB"/><ellipse rx="7" ry="1.6" fill="none" stroke="#E6F1FB" stroke-width="1"/></g><g class="pl" style="animation-delay:-2s"><circle r="3" fill="#97C459"/></g></g>
<g class="boop"><g><path d="M0 -5 ${STAR4}" fill="#FAC775" transform="scale(1.2)"/></g></g>
<g class="bulb" transform="translate(-26,-80)"><circle class="lit" r="10" fill="#FAC775" fill-opacity=".3"/><circle r="5.5" fill="#5F5E5A"/><circle class="lit" r="5.5" fill="#FAEEDA"/><rect x="-2.6" y="5" width="5.2" height="4" rx="1" fill="#888780"/><g class="rays" stroke="#FAC775" stroke-width="1.5" stroke-linecap="round"><line x1="0" y1="-10" x2="0" y2="-14"/><line x1="8" y1="-6" x2="11" y2="-8.5"/><line x1="-8" y1="-6" x2="-11" y2="-8.5"/></g></g>
<g class="confetti">${[
  [-58, '#F0997B', 0, ''], [-34, '#85B7EB', 0.3, ' k2'], [-12, '#FAC775', 0.9, ''], [10, '#97C459', 0.5, ' k2'],
  [30, '#ED93B1', 1.2, ''], [52, '#AFA9EC', 0.2, ' k2'], [-46, '#97C459', 1.5, ' k2'], [40, '#FAC775', 1.8, ''],
].map(([x, c, d, k]) => `<rect class="cf${k}" x="${x}" y="-112" width="3" height="5" fill="${c}" style="animation-delay:${d}s"/>`).join('')}</g>
<g class="notes" fill="#D3D1C7"><g transform="translate(-44,-38)"><g class="note"><ellipse rx="3" ry="2.3"/><rect x="2" y="-11" width="1.4" height="11"/><path d="M3.4 -11 q4 2 3 6" stroke="#D3D1C7" stroke-width="1.3" fill="none"/></g></g><g transform="translate(46,-30)"><g class="note" style="animation-delay:1s"><ellipse rx="3" ry="2.3"/><rect x="2" y="-11" width="1.4" height="11"/><path d="M3.4 -11 q4 2 3 6" stroke="#D3D1C7" stroke-width="1.3" fill="none"/></g></g></g>
<g class="flyw" transform="translate(36,10)"><g><rect x="-1.5" y="-9" width="3" height="14" fill="#B4B2A9"/><circle cx="0" cy="-10" r="4" fill="#B4B2A9"/><rect x="-1.4" y="-15" width="2.8" height="5" fill="#141B2D"/></g></g>
<g class="snap" transform="translate(42,-19)"><g class="snapc"><rect x="-6" y="-14" width="12" height="14" rx="1" fill="#F4F2ED" stroke="#B9B3A7" stroke-width=".6"/><rect x="-4.6" y="-12.6" width="9.2" height="8.6" fill="#2A3550"/><circle cx="1.8" cy="-9.6" r="1.6" fill="#FAC775"/><path d="M-4.6 -4 L-1.6 -7.4 L1 -5.2 L2.8 -6.6 L4.6 -4 Z" fill="#85B7EB"/></g></g>
<g class="rover" transform="translate(56,44)"><g class="rv"><rect x="-10" y="-8" width="20" height="9" rx="2" fill="#D3D1C7"/><rect x="-6" y="-12" width="9" height="5" rx="1" fill="#85B7EB"/><line x1="7" y1="-8" x2="9" y2="-16" stroke="#888780" stroke-width="1.2"/><circle class="dl" cx="9" cy="-16.5" r="1.4" fill="#E24B4A"/><g class="whl"><circle cx="-6" cy="2" r="3.5" fill="#444441"/><line x1="-6" y1="-1.5" x2="-6" y2="5.5" stroke="#888780"/></g><g class="whl"><circle cx="6" cy="2" r="3.5" fill="#444441"/><line x1="6" y1="-1.5" x2="6" y2="5.5" stroke="#888780"/></g></g></g>
<g class="mailr" transform="translate(46,-14)"><g class="mm"><g transform="rotate(-40)"><path d="M-9 -1 l-7 -3 l2 4 l-2 4 z" fill="#EF9F27"/><rect x="-8" y="-5" width="14" height="10" rx="1.5" fill="#F4F2ED" stroke="#B9B3A7" stroke-width=".6"/><path d="M-8 -5 l7 5 l7 -5" stroke="#B9B3A7" stroke-width=".8" fill="none"/></g></g></g>
<g class="bag" transform="translate(30,26)"><g class="bg"><path d="M-6 -4 q-2 10 2 12 h8 q4 -2 2 -12 z" fill="#5F5E5A"/><path d="M-3 -4 l3 -4 l3 4" stroke="#888780" stroke-width="1.4" fill="none"/></g></g>
<g class="holo" transform="translate(-46,-10)"><path class="beam" d="M4 26 L-10 4 L10 4 Z" fill="#5DCAA5" fill-opacity=".18"/><circle r="11" fill="none" stroke="#5DCAA5" stroke-width="1"/><ellipse class="mer" rx="11" ry="11" fill="none" stroke="#5DCAA5" stroke-width=".8"/><ellipse class="mer m2" rx="11" ry="11" fill="none" stroke="#5DCAA5" stroke-width=".8"/><ellipse rx="11" ry="3.5" fill="none" stroke="#5DCAA5" stroke-width=".7"/><line x1="-11" y1="0" x2="11" y2="0" stroke="#5DCAA5" stroke-width=".5"/></g>
<g class="dizzy" transform="translate(0,-64) scale(1,.4)"><g class="orb2"><circle r="30" fill="transparent"/><path d="M22 -6 ${STAR4}" fill="#FAC775"/><path d="M-22 -6 ${STAR4}" fill="#FAC775"/><path d="M0 16 ${STAR4}" fill="#FAEEDA"/></g></g>`

// One symbol bubble by the helmet, the same spot for every state.
const BUBBLES = `<g transform="translate(38,-64)">
<g class="b-think"><circle r="11" fill="#D3D1C7"/><circle class="d" cx="-5" cy="0" r="1.8" fill="#444441"/><circle class="d" cx="0" cy="0" r="1.8" fill="#444441" style="animation-delay:.3s"/><circle class="d" cx="5" cy="0" r="1.8" fill="#444441" style="animation-delay:.6s"/></g>
<g class="b-tool"><circle r="11" fill="#9FE1CB"/><g class="gear" fill="#085041"><rect x="-1.5" y="-7" width="3" height="14"/><rect x="-7" y="-1.5" width="14" height="3"/><rect x="-1.5" y="-7" width="3" height="14" transform="rotate(45)"/><rect x="-1.5" y="-7" width="3" height="14" transform="rotate(-45)"/><circle r="4.5"/><circle r="1.8" fill="#9FE1CB"/></g></g>
<g class="b-agents"><circle r="11" fill="#CECBF6"/><g stroke="#3C3489" stroke-width="1.4"><line x1="0" y1="-5" x2="-5" y2="4"/><line x1="0" y1="-5" x2="5" y2="4"/><line x1="-5" y1="4" x2="5" y2="4"/></g><g fill="#3C3489"><circle cy="-5" r="2.2"/><circle cx="-5" cy="4" r="2.2"/><circle cx="5" cy="4" r="2.2"/></g></g>
<g class="b-ask"><circle r="11" fill="#B5D4F4"/><path d="M-3.5 -4.5 q0 -4 3.5 -4 q3.5 0 3.5 3.2 q0 2.2 -3.5 3.3 v2.2" stroke="#0C447C" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0" cy="5" r="1.4" fill="#0C447C"/></g>
<g class="b-long"><circle r="11" fill="#FAC775"/><g class="hg"><path d="M-4 -6 h8 l-4 6 l4 6 h-8 l4 -6 z" fill="none" stroke="#633806" stroke-width="1.6" stroke-linejoin="round"/><path d="M-2 4.5 h4 l-2 -2.5z" fill="#633806"/></g></g>
<g class="b-wake"><circle r="11" fill="#FAEEDA"/><circle r="3.5" fill="#BA7517"/><g stroke="#BA7517" stroke-width="1.4" stroke-linecap="round"><line x1="0" y1="-6" x2="0" y2="-8.5"/><line x1="0" y1="6" x2="0" y2="8.5"/><line x1="-6" y1="0" x2="-8.5" y2="0"/><line x1="6" y1="0" x2="8.5" y2="0"/><line x1="4.3" y1="-4.3" x2="6" y2="-6"/><line x1="-4.3" y1="4.3" x2="-6" y2="6"/><line x1="4.3" y1="4.3" x2="6" y2="6"/><line x1="-4.3" y1="-4.3" x2="-6" y2="-6"/></g></g>
<g class="b-wait"><circle r="10" fill="#FAC775"/><rect x="-1.5" y="-6" width="3" height="8" rx="1" fill="#633806"/><circle cx="0" cy="5.5" r="1.7" fill="#633806"/></g>
<g class="b-compact"><circle r="11" fill="#9FE1CB"/><rect x="-3.5" y="-5" width="7" height="12" rx="3" fill="#085041"/><rect x="-1.8" y="-8" width="3.6" height="3" rx="1" fill="#085041"/></g>
<g class="b-done"><circle r="11" fill="#C0DD97"/><path d="M-5 0 l3.5 3.5 l6.5 -7" stroke="#27500A" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
<g class="b-abort"><circle r="11" fill="#D3D1C7"/><path d="M-6 1 q3 -5 6 0 t6 0" stroke="#444441" stroke-width="2" fill="none" stroke-linecap="round"/></g>
<g class="b-err"><circle r="11" fill="#F5C4B3"/><path d="M-4 -4 l8 8 M4 -4 l-8 8" stroke="#712B13" stroke-width="2.2" stroke-linecap="round"/></g>
</g>
<g class="zz" stroke="#D3D1C7" stroke-width="1.6" fill="none"><path d="M24 -60 h6 l-6 6 h6"/><path d="M32 -70 h5 l-5 5 h5" style="animation-delay:1s"/><path d="M40 -80 h4 l-4 4 h4" style="animation-delay:2s"/></g>`

// The root's classes pick the state: st-<mood>, v-<tool>, a-<version>, and
// low when the oxygen is nearly out.
function rootClass(b: Buddy): string {
  const alt = altOf(b)
  const low = b.o2 !== null && b.o2 < LOW_O2 ? ' low' : ''
  return `st-${b.mood} v-${b.tool} a-${alt}${low}`
}

// The astronaut with its tether, props and bubble, centered on its shoulders.
// The panel and the banner both place this same drawing.
function rigFor(b: Buddy, alien: string): string {
  const body = `<g class="flip">
${JET}<rect x="-24" y="-2" width="48" height="38" rx="7" fill="#C9C4BA"/>
<rect x="-15" y="30" width="12" height="16" rx="5" fill="#E4E0D8" stroke="#B9B3A7" stroke-width=".8"/><rect x="-16" y="42" width="14" height="8" rx="3" fill="#8A8F9C"/>
<g class="legR"><rect x="3" y="30" width="12" height="16" rx="5" fill="#E4E0D8" stroke="#B9B3A7" stroke-width=".8"/><rect x="2" y="42" width="14" height="8" rx="3" fill="#8A8F9C"/></g>
<rect x="-20" y="0" width="40" height="38" rx="11" ${SUIT}/>
<rect x="-11" y="12" width="22" height="11" rx="2" fill="#2C3A4F"/><rect x="-8" y="15" width="16" height="5" rx="1" fill="#1A2333"/>${gauge(b.o2)}<rect class="refill" x="-8" y="15" width="16" height="5" rx="1" fill="#5DCAA5"/>
${MAP}${LOGB}${CTRL}${ARM_L}${HEAD}${LAPTOP}${SPARKS}${GLASS}${ARM_R}${SBAG}</g>`
  return `<g class="enter"><g class="rig"><path d="M-14 22 C -50 52, -100 40, -200 84" stroke="#8A8F9C" stroke-width="2" fill="none"/>
<g class="sway">${sideProps(alien)}${body}${FRONT_PROPS}${BUBBLES}</g></g></g>`
}

// The big scene for the side panel that /astronaut opens.
export function svgFor(b: Buddy, name: string, alien: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 240" width="340" height="240" class="${rootClass(b)}">
<title>${escape(describe(b, name, alien))}</title><style>${STYLE}</style>
<defs><clipPath id="scn"><rect width="340" height="240" rx="8"/></clipPath></defs>
<g clip-path="url(#scn)">${BACKDROP}
<g transform="translate(170,120)">${rigFor(b, alien)}</g></g></svg>`
}

// The banner above the prompt box. It is drawn far wider than any chat and
// cut to the width it gets (left-aligned), so the astronaut and the words
// keep their size and the stars run to the edge however wide the window is.
export const BAND_HEIGHT = 88
const BAND_WIDTH = 2400
const FONT = 'font-family="system-ui,-apple-system,Segoe UI,sans-serif"'

// Where the words start, clear of the props the astronaut swings out.
const BAND_TEXT_X = 158

// Stars at fixed spots (a seeded sequence, so they don't jump on redraw).
const BAND_SKY = (() => {
  let seed = 7
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let stars = ''
  for (let i = 0; i < 120; i++) {
    const x = next() * BAND_WIDTH
    const y = 4 + next() * (BAND_HEIGHT - 8)
    const r = (0.6 + next() * 0.9).toFixed(1)
    const twinkle = i % 3 === 0 ? ` class="tw" style="animation-delay:${(next() * 3).toFixed(1)}s"` : ''
    // Keep the sky behind the words clear, so no star reads as punctuation.
    if (x > BAND_TEXT_X - 26 && x < BAND_TEXT_X + 640 && y > 10 && y < 80) continue
    stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}"${twinkle}/>`
  }
  const planets = ([
    [880, 112, 46], [1500, 22, 7], [2050, 118, 52],
  ] as const).map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2A3550"/>` +
    (r > 20 ? `<circle cx="${x - r * 0.35}" cy="${y - r * 0.55}" r="${(r * 0.14).toFixed(1)}" fill="#334063"/><circle cx="${x + r * 0.3}" cy="${y - r * 0.75}" r="${(r * 0.09).toFixed(1)}" fill="#334063"/>` : '')).join('')
  return `<rect width="${BAND_WIDTH}" height="${BAND_HEIGHT}" fill="#141B2D"/>${planets}<g fill="#E6F1FB" fill-opacity=".85">${stars}</g>`
})()

// Up to three rows beside the astronaut: what it's doing; the gauges (onboard
// memory is the context window still free, fuel the weekly usage limit still
// unused); then the mission (the task list) and the ship (the git branch).
// A row with nothing to show is left out and the rest are centered.
const DIM = '#8FA3BF'
const VALUE = '#C9D3E3'
const WARN = '#F09595'

function gaugeColor(left: number): string {
  return left > 0.5 ? '#5DCAA5' : left > LOW_O2 ? '#EF9F27' : '#E24B4A'
}

function bar(x: number, y: number, left: number): string {
  const share = Math.max(0, Math.min(1, left))
  return `<rect x="${x}" y="${y - 7}" width="36" height="6" rx="1" fill="#1A2333" stroke="#2C3A4F" stroke-width=".8"/><rect x="${x}" y="${y - 7}" width="${(36 * share).toFixed(1)}" height="6" rx="1" fill="${gaugeColor(share)}"/>`
}

// "Thu 9 PM" in the person's own time, or nothing if the time can't be read.
function refuelTime(iso: string | undefined): string {
  if (!iso) return ''
  try {
    const at = new Date(iso)
    if (Number.isNaN(at.getTime())) return ''
    return at.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(/:00(?=\s?[AP]M)/i, '')
  } catch {
    return ''
  }
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text
}

function gaugeRow(b: Buddy, y: number): string {
  let out = ''
  let x = BAND_TEXT_X
  if (b.o2 !== null) {
    const isLow = b.o2 < LOW_O2
    out += `<text x="${x}" y="${y}" ${FONT} font-size="12" fill="${DIM}">Memory</text>${bar(x + 54, y, b.o2)}<text x="${x + 96}" y="${y}" ${FONT} font-size="12" fill="${isLow ? WARN : VALUE}">${percent(b.o2)}% free</text>`
    x += 172
  }
  if (b.fuel) {
    const isLow = b.fuel.left < LOW_O2
    const when = refuelTime(b.fuel.resetsAt)
    const refuel = when ? `<tspan fill="${DIM}"> \u00b7 refuels ${escape(when)}</tspan>` : ''
    out += `<text x="${x}" y="${y}" ${FONT} font-size="12" fill="${DIM}">Fuel</text>${bar(x + 34, y, b.fuel.left)}<text x="${x + 76}" y="${y}" ${FONT} font-size="12" fill="${isLow ? WARN : VALUE}">${percent(b.fuel.left)}%${refuel}</text>`
  }
  return out
}

function infoRow(b: Buddy, y: number): string {
  const mission = missionOf(b.tasks)
  let spans = ''
  if (mission) {
    const what = mission.current ? `: ${escape(clip(mission.current, 38))}` : mission.done === mission.total ? ': complete' : ''
    spans += `<tspan fill="${DIM}">Mission </tspan><tspan fill="${VALUE}">${mission.done}/${mission.total}${what}</tspan>`
  }
  if (b.ship) {
    const gap = spans ? ' dx="22"' : ''
    spans += `<tspan fill="${DIM}"${gap}>Ship </tspan><tspan fill="${VALUE}">${escape(clip(b.ship.branch, 24))}, ${uncommitted(b.ship.changed)}</tspan>`
  }
  return spans ? `<text x="${BAND_TEXT_X}" y="${y}" ${FONT} font-size="12">${spans}</text>` : ''
}

function bandText(b: Buddy, name: string, alien: string): string {
  const hasGauges = b.o2 !== null || Boolean(b.fuel)
  const hasInfo = missionOf(b.tasks) !== null || Boolean(b.ship)
  const rows = 1 + (hasGauges ? 1 : 0) + (hasInfo ? 1 : 0)
  const [first, second, third] = rows === 3 ? [28, 50, 71] : rows === 2 ? [38, 59, 0] : [49, 0, 0]
  const action = `<text x="${BAND_TEXT_X}" y="${first}" ${FONT} font-size="15" fill="${VALUE}"><tspan font-weight="600" fill="#E6F1FB">${escape(name)}</tspan> ${escape(doingOf(b, alien))}</text>`
  const gauges = hasGauges ? gaugeRow(b, second) : ''
  const info = hasInfo ? infoRow(b, hasGauges ? third : second) : ''
  return `${action}\n${gauges}\n${info}`
}

export function bandFor(b: Buddy, name: string, alien: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BAND_WIDTH} ${BAND_HEIGHT}" width="${BAND_WIDTH}" height="${BAND_HEIGHT}" preserveAspectRatio="xMinYMid slice" class="${rootClass(b)} band">
<title>${escape(describe(b, name, alien))}</title><style>${STYLE}</style>${BAND_SKY}
<g transform="translate(72,52) scale(.58)">${rigFor(b, alien)}</g>
${bandText(b, name, alien)}</svg>`
}
