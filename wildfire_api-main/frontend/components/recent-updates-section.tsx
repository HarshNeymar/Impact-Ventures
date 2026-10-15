import { Card, CardContent } from "@/components/ui/card"

export function RecentUpdatesSection() {
  return (
    <section className="bg-gradient-to-b from-muted to-secondary py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12">Recent Updates</h2>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-card text-card-foreground overflow-hidden">
            <div className="relative h-48">
              <img
                src="/mobile-app-climate-action-simulation-dashboard.jpg"
                alt="Online Climate Action Simulation"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">SIMULATION</span>
              <h4 className="font-semibold text-lg mb-2 mt-1">Online Climate Action Simulation with Impact Ventures</h4>
              <p className="text-muted-foreground text-sm">
                Climate Change is undoubtedly one of the most pressing issues of our time, and the alarming implications
                for our planet and...
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground overflow-hidden">
            <div className="relative h-48">
              <img
                src="/data-analytics-dashboard-climate-monitoring-tools-.jpg"
                alt="Predictive Tools for Climate Monitoring"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">ANALYTICS</span>
              <h4 className="font-semibold text-lg mb-2 mt-1">Predictive Tools for Climate Monitoring</h4>
              <p className="text-muted-foreground text-sm">
                What if we could be providing vital insights and predictions about future climate...
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground overflow-hidden">
            <div className="relative h-48">
              <img
                src="/data-driven-climate-advocacy-impact-ventures-innov.jpg"
                alt="Data-Driven Climate Advocacy"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">ADVOCACY</span>
              <h4 className="font-semibold text-lg mb-2 mt-1">
                Data-Driven Climate Advocacy: Impact Ventures Innovates Solutions
              </h4>
              <p className="text-muted-foreground text-sm">
                In today's climate-conscious world, the integration of data-driven approaches has revolutionized how we
                understand and...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
