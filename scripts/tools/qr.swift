// QR PNG generator for the print CV.
//
// Local-only asset tool. It is NOT part of `npm run build`: the site build runs
// on GitHub Actions, where macOS and CoreImage do not exist. Run it by hand
// when a URL changes, then commit the PNGs it writes.
//
//   swift scripts/tools/qr.swift https://github.com/onezion12344 assets/qr/github.png
//
// CoreImage's CIQRCodeGenerator emits the bare symbol with no quiet zone, so the
// image is redrawn onto a white canvas with the 4-module margin the QR spec asks
// for. Skipping that margin is the usual reason a printed code will not scan.

import AppKit
import CoreImage
import Foundation

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: qr.swift <url> <out.png>\n".data(using: .utf8)!)
    exit(64)
}
let (payload, outPath) = (args[1], args[2])

guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
    FileHandle.standardError.write("CIQRCodeGenerator unavailable\n".data(using: .utf8)!)
    exit(1)
}
filter.setValue(payload.data(using: .utf8), forKey: "inputMessage")
// M recovers ~15%: enough for a phone camera on a slightly damp printed sheet
// without inflating the module count the way Q or H would.
filter.setValue("M", forKey: "inputCorrectionLevel")

guard let symbol = filter.outputImage else {
    FileHandle.standardError.write("encoder rejected the payload\n".data(using: .utf8)!)
    exit(1)
}

let quietModules: CGFloat = 4
let scale: CGFloat = 8
let side = (symbol.extent.width + quietModules * 2) * scale

guard let ctx = CGContext(
    data: nil, width: Int(side), height: Int(side),
    bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else { exit(1) }

ctx.setFillColor(NSColor.white.cgColor)
ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))
ctx.interpolationQuality = .none

let ciCtx = CIContext(options: [.useSoftwareRenderer: false])
guard let symbolCG = ciCtx.createCGImage(symbol, from: symbol.extent) else { exit(1) }
ctx.draw(symbolCG, in: CGRect(
    x: quietModules * scale, y: quietModules * scale,
    width: symbol.extent.width * scale, height: symbol.extent.height * scale
))

guard let png = ctx.makeImage() else { exit(1) }
let rep = NSBitmapImageRep(cgImage: png)
guard let data = rep.representation(using: .png, properties: [:]) else { exit(1) }
try data.write(to: URL(fileURLWithPath: outPath))
print("\(outPath)  \(Int(side))px  \(payload)")
