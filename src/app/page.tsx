import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-24 py-20">
      <section className="text-center space-y-10">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.5em] text-[#c5a028] font-bold">The Science of Logic</p>
          <h1 className="text-7xl font-serif font-light tracking-tight text-[#1c1c1c] leading-tight">
            Universal <br /> <span className="italic font-normal">Computation</span> Sandbox
          </h1>
        </div>
        
        <p className="text-sm text-gray-400 max-w-2xl mx-auto leading-loose tracking-wide">
          Navigate the boundaries of what is possible. From the simplicity of Finite Automata 
          to the infinite potential of Universal Turing Machines, we provide a sophisticated 
          environment for theoretical exploration and algorithmic analysis.
        </p>

        <div className="flex justify-center gap-8 pt-4">
          <Link href="/sandbox" className="btn-primary flex items-center gap-4 group">
            Begin Expedition
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/models" className="btn-outline">
            The Archive
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e8e8e1]">
        {[
          { title: 'Automata', desc: 'DFA, NFA, and PDAs. The foundations of regular and context-free languages.', area: '01' },
          { title: 'Universality', desc: 'Simulate Turing Machines and witness the precision of the Church-Turing thesis.', area: '02' },
          { title: 'Complexity', desc: 'Real-time analysis of time and space, quantifying the efficiency of thought.', area: '03' }
        ].map((feat, i) => (
          <div key={feat.title} className={`p-10 space-y-6 bg-white hover:bg-[#fdfdfc] transition-colors ${i !== 2 ? 'border-r border-[#e8e8e1]' : ''}`}>
            <div className="text-[10px] font-serif italic text-[#c5a028]">{feat.area}</div>
            <h3 className="text-2xl font-serif text-[#1c1c1c]">{feat.title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      <section className="bg-[#f8f8f2] p-16 text-center space-y-8 border border-[#e8e8e1]">
        <h2 className="text-3xl font-serif text-[#1c1c1c]">The Church-Turing Thesis</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-3xl mx-auto italic">
          "Every function which would naturally be regarded as computable can be computed by a Turing machine."
          <span className="block mt-4 not-italic font-bold text-[10px] uppercase tracking-widest text-[#c5a028]">The Blueprint of Modern Computing</span>
        </p>
      </section>
      
      <footer className="text-center pt-20 border-t border-[#e8e8e1]">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-medium">© 2026 Universal Computation Sandbox • A Tribute to Turing</p>
      </footer>
    </div>
  );
}

