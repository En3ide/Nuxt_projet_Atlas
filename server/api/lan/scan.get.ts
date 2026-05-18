import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { XMLParser } from 'fast-xml-parser'

const execFileAsync = promisify(execFile)

export default defineEventHandler(async () => {

    try {

        const scanFile =
            '/tmp/atlas-nmap-scan.xml'

        const result =
            await execFileAsync('nmap', [
                '-sn',
                '192.168.1.0/24',
                '-oX',
                scanFile
            ])

        console.log(result.stdout)
        console.log(result.stderr)

        const xml =
            await readFile(scanFile, 'utf-8')

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: ''
        })

        const parsed =
            parser.parse(xml)

        const hosts =
            Array.isArray(parsed.nmaprun.host)
                ? parsed.nmaprun.host
                : [parsed.nmaprun.host]

        return hosts
            .filter((host: any) =>
                host.status?.state === 'up'
            )
            .map((host: any) => {

                const addresses =
                    Array.isArray(host.address)
                        ? host.address
                        : [host.address]

                const ipv4 =
                    addresses.find(
                        (addr: any) =>
                            addr.addrtype === 'ipv4'
                    )

                const mac =
                    addresses.find(
                        (addr: any) =>
                            addr.addrtype === 'mac'
                    )

                return {
                    hostname:
                        host.hostnames?.hostname?.name ||
                        'Unknown',

                    ipv4:
                        ipv4?.addr || 'Unknown',

                    mac:
                        mac?.addr || 'Unknown',

                    vendor:
                        mac?.vendor || 'Unknown',

                    type:
                        guessDeviceType(
                            mac?.vendor || ''
                        ),

                    status: 'ONLINE'
                }
            })

    } catch (error) {

        console.error(
            'SCAN API ERROR:',
            error
        )

        throw createError({
            statusCode: 500,
            statusMessage: 'NMAP_SCAN_FAILED'
        })
    }
})

function guessDeviceType(vendor: string) {

    const value =
        vendor.toLowerCase()

    if (value.includes('raspberry'))
        return 'Raspberry Pi'

    if (value.includes('intel'))
        return 'PC'

    if (value.includes('realtek'))
        return 'PC'

    if (value.includes('tp-link'))
        return 'IoT / Router'

    if (value.includes('samsung'))
        return 'Smartphone'

    return 'Network Device'
}