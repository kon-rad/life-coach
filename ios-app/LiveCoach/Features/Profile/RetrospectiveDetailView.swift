import SwiftUI

struct RetrospectiveDetailView: View {
    let retro: Retrospective
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                section("What went well", retro.wentWell)
                section("What to improve", retro.improve)
                section("1% better next week", retro.onePercent)
                section("Summary", retro.summary)
            }.padding(16)
        }
        .background(Color.lcBackground)
        .navigationTitle("Week \(retro.weekNumber)")
    }
    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            LCSectionLabel(title: title)
            Text(body).font(.system(size: 15)).foregroundStyle(Color.lcText)
        }
    }
}
