//
//  WebCallResponse.swift
//
//
//  Created by Andrew Carter on 12/13/23.
//

import Foundation

public struct ArtifactPlan: Decodable {
    // Optional: as of ~2026-06-03 VAPI's /call/web response no longer includes
    // videoRecordingEnabled inside artifactPlan (it moved to transport), which made
    // decoding throw and every call die before joining the room. Upstream fix is
    // pending (VapiAI/client-sdk-ios PR #40); this vendored copy applies it locally.
    public let videoRecordingEnabled: Bool?
}

public struct WebCallResponse: Decodable {
    let webCallUrl: URL
    public let id: String
    public let artifactPlan: ArtifactPlan?
}
