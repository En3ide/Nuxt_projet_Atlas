<template>
  <div class="contenu">
    <div class="pannel terminal-pannel">

      <!-- HEADER -->
      <div class="terminal-header">
        <div class="terminal-title">
          atlas@terminal
        </div>
      </div>

      <!-- TERMINAL -->
      <div
        class="terminal-body"
        @click="focusInput"
      >

        <!-- HISTORIQUE -->
        <div
          v-for="(line, index) in history"
          :key="index"
        >

          <!-- COMMANDE -->
          <div class="terminal-line">

            <span class="prompt">
              atlas@server:~$
            </span>

            <span class="command">
              {{ line.command }}
            </span>

          </div>

          <!-- RÉPONSE -->
          <div
            v-if="line.response"
            class="terminal-response"
          >
            {{ line.response }}
          </div>

        </div>

        <!-- INPUT -->
        <div class="terminal-line">

          <span class="prompt">
            atlas@server:~$
          </span>

          <div class="input-container">

            <span class="typed-text">
              {{ currentCommand }}
            </span>

            <span class="cursor"></span>

            <input
              ref="terminalInput"
              v-model="currentCommand"
              class="hidden-input"
              type="text"
              autofocus
              autocomplete="off"
              spellcheck="false"
              @keydown.enter="submitCommand"
            />

          </div>

        </div>

      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface TerminalLine {
  command: string
  response: string
}

export default defineComponent({
  name: 'Terminal',

  data() {
    return {
      currentCommand: '',

      history: [] as TerminalLine[]
    }
  },

  methods: {

    async submitCommand() {

      const cmd = this.currentCommand.trim()

      if (!cmd) return

      this.history.push({
        command: cmd,
        response: 'Loading...'
      })

      const currentIndex = this.history.length - 1

      this.currentCommand = ''

      try {

        const response = await fetch(
          'http://192.168.1.1',
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body: JSON.stringify({
              command: cmd
            })
          }
        )

        const data = await response.text()

        this.history[currentIndex].response = data

      } catch (error) {

        console.error(error)

        this.history[currentIndex].response =
          'Connection error'

      }

      this.$nextTick(() => {
        this.focusInput()
      })
    },

    focusInput() {

      const input =
        this.$refs.terminalInput as HTMLInputElement

      if (input) {
        input.focus()
      }
    }
  }
})
</script>

<style scoped>

/* ===== TERMINAL ===== */

.terminal-pannel {
    width: 100%;
    min-height: 85vh;

    padding: 0;

    overflow: hidden;

    background-color: rgb(10, 10, 10);

    border-radius: 24px;

    border: 1px solid rgba(255,255,255,0.05);
}

/* ===== HEADER ===== */

.terminal-header {
    height: 60px;

    background-color: rgb(18, 18, 18);

    border-bottom: 1px solid rgba(255,255,255,0.05);

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0 20px;
}

.terminal-title {
    color: rgba(255,255,255,0.65);

    font-size: 14px;

    font-family: monospace;

    letter-spacing: 1px;
}

/* ===== BODY ===== */

.terminal-body {
    padding: 24px;

    font-family: monospace;

    font-size: 16px;

    color: #00ff9c;

    line-height: 1.8;

    cursor: text;
}

/* ===== LINES ===== */

.terminal-line {
    display: flex;
    align-items: center;

    gap: 10px;

    margin-bottom: 6px;

    flex-wrap: wrap;
}

.prompt {
    color: cyan;

    white-space: nowrap;
}

.command {
    color: white;
}

/* ===== RESPONSE ===== */

.terminal-response {
    color: rgba(0,255,156,0.8);

    margin-left: 10px;

    margin-bottom: 12px;

    white-space: pre-wrap;
}

/* ===== INPUT ===== */

.input-container {
    position: relative;

    display: inline-flex;
    align-items: center;

    min-height: 24px;
}

.typed-text {
    color: white;

    white-space: pre;
}

/* ===== CURSOR ===== */

.cursor {
    width: 10px;
    height: 20px;

    background-color: #00ff9c;

    margin-left: 2px;

    animation: blink 1s infinite;
}

@keyframes blink {

    0% {
        opacity: 1;
    }

    50% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

/* ===== INPUT INVISIBLE ===== */

.hidden-input {
    position: absolute;

    opacity: 0;

    pointer-events: none;
}

</style>