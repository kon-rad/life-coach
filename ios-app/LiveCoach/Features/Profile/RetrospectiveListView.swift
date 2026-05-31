import SwiftUI

struct RetrospectiveListView: View {
    @State private var service = RetrospectiveService()
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(service.retrospectives) { r in
                    NavigationLink { RetrospectiveDetailView(retro: r) } label: {
                        LCCard {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Week \(r.weekNumber)")
                                    .font(.system(size: 16, weight: .semibold)).foregroundStyle(Color.lcText)
                                Text("\(r.startDate) – \(r.endDate)")
                                    .font(.system(size: 12)).foregroundStyle(Color.lcTextDim)
                                Text(r.summary).font(.system(size: 13)).foregroundStyle(Color.lcTextDim)
                                    .lineLimit(2).multilineTextAlignment(.leading)
                            }
                        }
                    }.buttonStyle(.plain)
                }
            }.padding(16)
        }
        .background(Color.lcBackground)
        .navigationTitle("Weekly Retrospectives")
        .task { await service.load() }
    }
}
