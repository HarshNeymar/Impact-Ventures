export function ClimateImageSection() {
  return (
    <section className="relative h-96 md:h-[500px] overflow-hidden">
      <img
        src="/placeholder-qfn19.png"
        alt="Dramatic stormy sky representing climate change"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </section>
  )
}
