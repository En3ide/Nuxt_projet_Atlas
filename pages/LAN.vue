<template>
  <div class="contenu">

    <div class="pannel lan-pannel">

      <!-- HEADER -->
      <div class="lan-header">

        <div>
          <h1>LAN Monitor</h1>

          <p>
            Appareils détectés sur le réseau local
          </p>
        </div>

        <div class="lan-status">
          {{ devices.length }} appareils
        </div>

      </div>

      <!-- TABLE -->
      <div class="table-wrapper">

        <table class="lan-table">

          <thead>
            <tr>

              <th @click="sortBy('hostname')">
                Hostname
              </th>

              <th @click="sortBy('ipv4')">
                IPv4
              </th>

              <th @click="sortBy('mac')">
                MAC
              </th>

              <th @click="sortBy('vendor')">
                Vendor
              </th>

              <th @click="sortBy('type')">
                Type
              </th>

              <th @click="sortBy('status')">
                Status
              </th>

            </tr>
          </thead>

          <tbody>

            <tr
              v-for="device in sortedDevices"
              :key="device.mac"
            >

              <td>
                {{ device.hostname }}
              </td>

              <td>
                {{ device.ipv4 }}
              </td>

              <td>
                {{ device.mac }}
              </td>

              <td>
                {{ device.vendor }}
              </td>

              <td>
                {{ device.type }}
              </td>

              <td>
                <span
                  class="status"
                  :class="device.status === 'ONLINE'
                    ? 'online'
                    : 'offline'"
                >
                  {{ device.status }}
                </span>
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

  </div>
</template>

<script lang="ts">
export default {

  name: 'LAN',

  data() {
    return {

      devices: [] as Array<{
        hostname: string
        ipv4: string
        mac: string
        vendor: string
        type: string
        status: string
      }>,

      currentSort: 'hostname',

      sortDirection: 'asc'
    }
  },

  computed: {

    sortedDevices(): Array<any> {

      const devices = [...this.devices]

      devices.sort((a, b) => {

        let valueA =
          a[this.currentSort]?.toLowerCase()

        let valueB =
          b[this.currentSort]?.toLowerCase()

        if (valueA < valueB) {
          return this.sortDirection === 'asc'
            ? -1
            : 1
        }

        if (valueA > valueB) {
          return this.sortDirection === 'asc'
            ? 1
            : -1
        }

        return 0
      })

      return devices
    }
  },

  methods: {

    async loadDevices() {

      try {

        const response =
          await fetch('/api/lan/scan')

        // API KO
        if (!response.ok) {
          throw new Error('API ERROR')
        }

        const data =
          await response.json()

        // Données invalides
        if (
          !Array.isArray(data) ||
          data.length === 0
        ) {
          throw new Error('INVALID DATA')
        }

        this.devices = data

      } catch (error) {

        console.error(
          'Impossible de récupérer les appareils réseau :',
          error
        )

        /*
          FALLBACK FACTICE
        */

        this.devices = [

          {
            hostname: 'atlas-server',
            ipv4: '192.168.1.1',
            mac: 'A4:5E:60:11:2F:90',
            vendor: 'Intel',
            type: 'Serveur / NAS',
            status: 'ONLINE'
          },

          {
            hostname: 'desktop-main',
            ipv4: '192.168.1.10',
            mac: '34:97:F6:8A:21:BC',
            vendor: 'Realtek',
            type: 'PC',
            status: 'ONLINE'
          },

          {
            hostname: 'raspberrypi-home',
            ipv4: '192.168.1.20',
            mac: 'B8:27:EB:42:19:FA',
            vendor: 'Raspberry Pi',
            type: 'IoT',
            status: 'ONLINE'
          },

          {
            hostname: 'camera-entry',
            ipv4: '192.168.1.31',
            mac: 'E0:50:8B:91:42:AA',
            vendor: 'TP-Link',
            type: 'Caméra IP',
            status: 'ONLINE'
          },

          {
            hostname: 'phone-jamel',
            ipv4: '192.168.1.42',
            mac: '9C:2A:70:55:18:CC',
            vendor: 'Samsung',
            type: 'Smartphone',
            status: 'OFFLINE'
          }
        ]
      }
    },

    sortBy(field: string) {

      if (this.currentSort === field) {

        this.sortDirection =
          this.sortDirection === 'asc'
            ? 'desc'
            : 'asc'

      } else {

        this.currentSort = field

        this.sortDirection = 'asc'
      }
    }
  },

  mounted() {
    this.loadDevices()
  }
}
</script>

<style scoped>

.lan-pannel {
    width: 100%;

    min-height: 85vh;
}

/* -_-_-_- HEADER -_-_-_- */

.lan-header {
    display: flex;

    justify-content: space-between;
    align-items: center;

    margin-bottom: 24px;
}

.lan-header h1 {
    margin: 0;

    font-size: 28px;
}

.lan-header p {
    margin: 8px 0 0 0;

    color: rgba(255,255,255,0.55);
}

/* -_-_-_- STATUS -_-_-_- */

.lan-status {
    padding: 10px 18px;

    border-radius: 12px;

    color: rgb(0,255,120);

    background-color: rgba(0,255,120,0.12);

    border: 1px solid rgba(0,255,120,0.2);

    font-size: 13px;
    font-weight: bold;
}

/* -_-_-_- TABLE -_-_-_- */

.table-wrapper {
    width: 100%;

    overflow-x: auto;
}

.lan-table {
    width: 100%;

    border-collapse: collapse;

    min-width: 900px;
}

.lan-table th,
.lan-table td {
    padding: 16px;

    text-align: left;

    border-bottom:
      1px solid rgba(255,255,255,0.06);
}

.lan-table th {
    color: rgba(255,255,255,0.45);

    font-size: 12px;

    text-transform: uppercase;

    letter-spacing: 1px;

    cursor: pointer;

    transition: color 0.2s ease;
}

.lan-table th:hover {
    color: white;
}

.lan-table td {
    color: rgba(255,255,255,0.82);

    font-size: 14px;
}

.lan-table tbody tr:hover {
    background-color: rgba(255,255,255,0.03);
}

/* -_-_-_- STATUS -_-_-_- */

.status {
    padding: 6px 10px;

    border-radius: 10px;

    font-size: 12px;
    font-weight: bold;
}

.online {
    color: rgb(0,255,120);

    background-color:
      rgba(0,255,120,0.12);
}

.offline {
    color: rgb(255,95,86);

    background-color:
      rgba(255,95,86,0.12);
}

/* -_-_-_- RESPONSIVE -_-_-_- */

@media screen and (max-width: 768px) {

    .lan-header {
        flex-direction: column;

        align-items: flex-start;

        gap: 16px;
    }
}

</style>