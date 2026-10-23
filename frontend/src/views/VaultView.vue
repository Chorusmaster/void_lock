<script setup lang="ts">
import { ref } from 'vue'

const symbols = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')
const codeLength = 5

const code = ref<(string | null)[]>(
  Array(codeLength).fill(null)
)

const draggedSymbol = ref<string | null>(null)
const draggedIndex = ref<number | null>(null)

function onDragStart(symbol: string, index: number | null = null) {
  draggedSymbol.value = symbol
  draggedIndex.value = index
}

function onDrop(index: number) {
  if (!draggedSymbol.value) return

  const next = [...code.value]

  if (draggedIndex.value !== null) {
    // Переміщення символу всередині коду
    const oldIndex = draggedIndex.value
    next[oldIndex] = next[index]
    next[index] = draggedSymbol.value
  } else {
    // Додавання символу зі списку
    next[index] = draggedSymbol.value
  }

  code.value = next
  draggedSymbol.value = null
  draggedIndex.value = null
}

function clearCode() {
  code.value = Array(codeLength).fill(null)
}

function removeSymbol(index: number) {
  code.value[index] = null
}

function unlockVault() {
  if (code.value.some(symbol => symbol === null)) return

  // TODO: Надіслати код на сервер для перевірки
  console.log('Entered code:', code.value.join(''))
}
</script>

<template>
  <main class="vault-page">
    <header class="topbar">
      <div class="brand">
        <span class="brand-icon">⌘</span>
        <span>VOIDLOCK</span>
      </div>
      <div class="connection">
        <span class="status-dot"></span>
        SYSTEM ONLINE
      </div>
    </header>

    <section class="vault-content">
      <div class="eyebrow">UNKNOWN ARTIFACT · 001</div>
      <h1>Alien Vault</h1>
      <p class="subtitle">
        Reconstruct the alien sequence to unlock the vault.
      </p>

      <div class="vault-frame">
        <div class="vault-ring ring-outer"></div>
        <div class="vault-ring ring-inner"></div>

        <div class="vault-core">
          <div class="core-label">SECURITY TERMINAL</div>

          <div class="code-slots">
            <div
              v-for="(symbol, index) in code"
              :key="index"
              class="code-slot"
              :class="{ filled: symbol !== null }"
              @dragover.prevent
              @drop.prevent="onDrop(index)"
              @click="removeSymbol(index)"
            >
              <span v-if="symbol" class="slot-symbol">
                {{ symbol }}
              </span>
              <span v-else class="slot-number">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
            </div>
          </div>

          <div class="slot-hint">
            DRAG SYMBOLS INTO SEQUENCE
          </div>

          <button
            class="unlock-button"
            :disabled="code.some(symbol => symbol === null)"
            @click="unlockVault"
          >
            UNLOCK VAULT <span>→</span>
          </button>

          <button class="clear-button" @click="clearCode">
            CLEAR SEQUENCE
          </button>
        </div>
      </div>

      <section class="symbol-panel">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">TRANSLATION INTERFACE</div>
            <h2>Alien Glyphs</h2>
          </div>
          <span class="symbol-count">{{ symbols.length }} SYMBOLS</span>
        </div>

        <div class="symbol-grid">
          <button
            v-for="symbol in symbols"
            :key="symbol"
            class="symbol-tile"
            draggable="true"
            @dragstart="onDragStart(symbol)"
            @click="
              () => {
                const emptyIndex = code.findIndex(s => s === null)
                if (emptyIndex !== -1) code[emptyIndex] = symbol
              }
            "
          >
            <span class="glyph">{{ symbol }}</span>
            <span class="glyph-caption">GLYPH-{{ symbol }}</span>
          </button>
        </div>

        <p class="footer-hint">
          SELECT A GLYPH OR DRAG IT INTO AN EMPTY SLOT
        </p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.vault-page {
  min-height: 100vh;
  background: #080c12;
  color: #e6edf5;
  font-family: Inter, system-ui, sans-serif;
  padding-bottom: 64px;
}

.topbar {
  height: 68px;
  padding: 0 6%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #1b2935;
  background: #0b1119;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 3px;
}

.brand-icon {
  color: #72e3df;
  font-size: 25px;
}

.connection,
.eyebrow,
.core-label,
.slot-hint,
.glyph-caption,
.footer-hint,
.symbol-count {
  font-family: monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
}

.connection {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8a9aa9;
}

.status-dot {
  width: 7px;
  height: 7px;
  background: #65e6bb;
  border-radius: 50%;
  box-shadow: 0 0 10px #65e6bb88;
}

.vault-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 56px 24px 0;
}

.eyebrow {
  color: #6bd8d3;
}

h1 {
  font-size: clamp(30px, 5vw, 46px);
  letter-spacing: -1.5px;
  margin: 12px 0;
}

.subtitle {
  color: #8c9ba9;
  font-size: 14px;
  line-height: 1.7;
}

.vault-frame {
  margin: 44px auto 58px;
  max-width: 620px;
  aspect-ratio: 1.65;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid #263c4b;
  border-radius: 8px;
  background:
    linear-gradient(#15232d99 1px, transparent 1px),
    linear-gradient(90deg, #15232d99 1px, transparent 1px),
    radial-gradient(ellipse at center, #17323b 0%, #0b141d 60%, #080c12 100%);
  background-size: 28px 28px, 28px 28px, auto;
}

.vault-ring {
  position: absolute;
  aspect-ratio: 1;
  border: 1px solid #284b57;
  border-radius: 50%;
  pointer-events: none;
}

.ring-outer {
  width: 85%;
  border-style: dashed;
  opacity: 0.45;
}

.ring-inner {
  width: 67%;
  border-color: #315964;
  box-shadow: 0 0 35px #38bcb51a;
}

.vault-core {
  position: relative;
  z-index: 1;
  width: min(82%, 440px);
  padding: 22px;
  background: #0b121bea;
  border: 1px solid #31515e;
  border-radius: 5px;
  text-align: center;
  box-shadow: 0 12px 50px #0008;
}

.core-label {
  color: #7999a7;
  margin-bottom: 20px;
}

.code-slots {
  display: flex;
  justify-content: center;
  gap: 9px;
}

.code-slot {
  width: 52px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 1px dashed #405865;
  border-radius: 4px;
  background: #101d27;
  cursor: pointer;
  transition: 0.15s;
}

.code-slot:hover,
.code-slot.filled {
  border-color: #62d9d2;
  background: #153038;
}

.slot-symbol {
  font-size: 27px;
  font-weight: 700;
  color: #8bf2e9;
}

.slot-number {
  font: 11px monospace;
  color: #536a79;
}

.slot-hint {
  color: #718895;
  margin: 15px 0 20px;
  font-size: 9px;
}

.unlock-button {
  width: 100%;
  padding: 13px;
  background: #6ce0d7;
  color: #071316;
  border: 0;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  cursor: pointer;
}

.unlock-button span {
  margin-left: 10px;
}

.unlock-button:disabled {
  background: #263d43;
  color: #738d91;
  cursor: not-allowed;
}

.clear-button {
  margin-top: 12px;
  background: transparent;
  border: 0;
  color: #8b9da8;
  font-size: 10px;
  letter-spacing: 1.5px;
  cursor: pointer;
}

.symbol-panel {
  border: 1px solid #1e303d;
  background: #0b1119;
  padding: 24px;
  border-radius: 6px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}

h2 {
  margin: 7px 0 0;
  font-size: 20px;
}

.symbol-count {
  color: #78909e;
}

.symbol-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.symbol-tile {
  aspect-ratio: 1;
  min-width: 0;
  background: #101923;
  border: 1px solid #293c49;
  border-radius: 4px;
  color: #bce8e5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: grab;
  transition: background 0.15s, border-color 0.15s,
    transform 0.15s;
}

.symbol-tile:hover {
  border-color: #62d9d2;
  background: #173039;
  transform: translateY(-2px);
}

.symbol-tile:active {
  cursor: grabbing;
}

.glyph {
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 650;
}

.glyph-caption {
  color: #708592;
  font-size: 8px;
  letter-spacing: 0.5px;
}

.footer-hint {
  color: #657a87;
  margin: 20px 0 0;
  text-align: center;
  font-size: 9px;
}

@media (max-width: 520px) {
  .vault-content {
    padding: 36px 14px 0;
  }

  .vault-frame {
    aspect-ratio: 1.1;
    margin: 30px auto 38px;
  }

  .vault-core {
    width: 94%;
    padding: 16px 10px;
  }

  .code-slots {
    gap: 5px;
  }

  .code-slot {
    width: min(17%, 48px);
    height: 48px;
  }

  .symbol-panel {
    padding: 15px;
  }

  .symbol-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
  }

  .glyph-caption {
    font-size: 7px;
  }
}
</style>
