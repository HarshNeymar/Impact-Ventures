import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function GetInvolvedSection() {
  return (
    <section className="bg-primary text-primary-foreground py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Get Involved</h2>
        <h3 className="text-xl md:text-2xl text-center mb-12 text-primary-foreground/90">Upcoming Events</h3>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-card text-card-foreground overflow-hidden">
            <div className="relative h-48">
              <img
                src="/burning-earth-climate-crisis-data-visualization.jpg"
                alt="Data Science for Climate Impact"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <h4 className="font-semibold text-lg mb-2">Data Science for Climate Impact</h4>
              <p className="text-muted-foreground text-sm mb-1">Fri, Sep 8 • University of San Francisco</p>
              <p className="text-muted-foreground text-sm mb-4">More info</p>
              <Button variant="secondary" className="w-full bg-foreground text-background hover:bg-foreground/90">
                Details
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground overflow-hidden">
            <div className="relative h-48">
              <img src="/climate-game-night-environmental-strategy-board-ga.jpg" alt="Climate Game Night" className="w-full h-full object-cover" />
            </div>
            <CardContent className="p-6">
              <h4 className="font-semibold text-lg mb-2">Climate Game Night</h4>
              <p className="text-muted-foreground text-sm mb-1">Sun, Aug 11 • Virtual Event</p>
              <p className="text-muted-foreground text-sm mb-4">More info</p>
              <Button variant="secondary" className="w-full bg-foreground text-background hover:bg-foreground/90">
                Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
