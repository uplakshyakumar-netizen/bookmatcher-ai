// Sample Textbook & Notes Store (Node.js & Next.js)

export const SAMPLE_NOTES = `# Lecture 4: Virtual Memory & Address Translation
* Virtual memory provides each process with the illusion of an isolated, continuous address space while mapping to disparate physical frames.
* The Translation Lookaside Buffer (TLB) is a high-speed hardware cache that stores recent virtual-to-physical address translations.
* A page fault exception occurs when a program attempts to access a memory address whose valid bit in the page table is zero.
* When a page fault occurs, the OS traps into kernel mode, reads the missing page frame from secondary swap storage, and updates the PTE.

# Lecture 6: Concurrency & Process Synchronization
* Mutex locks and counting semaphores enforce mutual exclusion around critical sections to prevent race conditions.
* Deadlock requires all four Coffman conditions: mutual exclusion, hold and wait, no preemption, and circular wait.
* The Banker's Algorithm prevents deadlocks by simulating resource allocation and only proceeding if a safe state is guaranteed.

# Lecture 8: Distributed Consensus & Fault Tolerance
* The CAP theorem states that a distributed datastore can guarantee at most two of Consistency, Availability, and Partition Tolerance.
* Raft decomposes consensus into three distinct subproblems: leader election, log replication, and safety guarantees.
* In Raft, when a follower node experiences an election timeout without receiving heartbeats, it transitions to Candidate state and votes for itself.
* Two-Phase Commit (2PC) guarantees distributed atomicity through an initial voting Prepare phase followed by a Commit or Abort phase.
`;

export const CHAPTERS = [
  {
    title: "Chapter 1: Operating System Architectures & Kernel Models",
    startPage: 1,
    sections: [
      {
        pageNumber: 2,
        title: "1.1 Kernel Modes and System Calls",
        lines: [
          "Modern computer operating systems employ dual-mode hardware operation to separate user space from privileged kernel space.",
          "System calls serve as the programmatic interface between a running application and the underlying operating system services.",
          "When a program initiates a system call, the CPU transitions from user mode to supervisor mode via a software trap interrupt.",
          "Hardware timers prevent runaway processes by periodically generating interrupts to trigger context switching.",
          "Microkernels minimize kernel complexity by running device drivers and file systems as unprivileged user-space servers."
        ]
      },
      {
        pageNumber: 3,
        title: "1.2 Process Scheduling and State Transitions",
        lines: [
          "A process transitions through distinct operational states: New, Ready, Running, Waiting, and Terminated.",
          "The round-robin scheduling algorithm assigns a fixed time quantum to each ready process in a cyclic FIFO queue.",
          "Shortest Job First (SJF) scheduling optimizes average turnaround time but risks starvation for lengthy CPU-bound tasks.",
          "Priority inversion occurs when a low-priority thread holds a lock required by a high-priority thread without yielding."
        ]
      }
    ]
  },
  {
    title: "Chapter 2: Memory Management & Virtual Memory Systems",
    startPage: 4,
    sections: [
      {
        pageNumber: 4,
        title: "2.1 Virtual Memory Fundamentals",
        lines: [
          "Virtual memory provides each process with the illusion of an isolated, continuous address space while mapping to disparate physical frames.",
          "Address translation hardware within the Memory Management Unit (MMU) converts virtual addresses into physical addresses dynamically.",
          "Paging divides logical memory into uniform blocks called pages, and physical memory into corresponding page frames.",
          "Page tables maintain translation records known as Page Table Entries (PTE), containing frame addresses and protection flags."
        ]
      },
      {
        pageNumber: 5,
        title: "2.2 TLB and Hardware Caching",
        lines: [
          "The Translation Lookaside Buffer (TLB) is a high-speed hardware cache that stores recent virtual-to-physical address translations.",
          "A TLB hit enables the processor to resolve physical addresses in a single cycle without querying main memory page tables.",
          "A TLB miss forces an MMU page table walk across multi-level hierarchical tables, imposing significant latency penalties.",
          "Address Space Identifiers (ASID) tag TLB entries to eliminate the costly requirement of flushing the cache on each context switch."
        ]
      },
      {
        pageNumber: 6,
        title: "2.3 Page Fault Handling and Demand Paging",
        lines: [
          "A page fault exception occurs when a program attempts to access a memory address whose valid bit in the page table is zero.",
          "Demand paging avoids loading entire programs into RAM, fetching individual pages on demand only when referenced.",
          "When a page fault occurs, the OS traps into kernel mode, reads the missing page frame from secondary swap storage, and updates the PTE.",
          "Page replacement algorithms such as Least Recently Used (LRU) choose victim pages to evict when physical memory becomes exhausted.",
          "Thrashing describes the catastrophic performance degradation that occurs when an OS spends more time paging than executing code."
        ]
      }
    ]
  },
  {
    title: "Chapter 3: Concurrency, Locks, and Deadlock Avoidance",
    startPage: 7,
    sections: [
      {
        pageNumber: 7,
        title: "3.1 Synchronization Primitives",
        lines: [
          "Concurrent threads executing in shared memory require synchronization primitives to prevent non-deterministic race conditions.",
          "Mutex locks and counting semaphores enforce mutual exclusion around critical sections to prevent race conditions.",
          "Atomic test-and-set and compare-and-swap (CAS) hardware instructions allow lock-free synchronization algorithms.",
          "Condition variables allow threads to sleep efficiently until signaled that a specific shared state predicate has been fulfilled."
        ]
      },
      {
        pageNumber: 8,
        title: "3.2 Deadlock Theory and Coffman Conditions",
        lines: [
          "A deadlock occurs when a set of threads are permanently blocked, each waiting for a resource held by another in the set.",
          "Deadlock requires all four Coffman conditions: mutual exclusion, hold and wait, no preemption, and circular wait.",
          "Eliminating circular wait by enforcing a strict global resource acquisition ordering is the most common deadlock prevention strategy.",
          "The Banker's Algorithm prevents deadlocks by simulating resource allocation and only proceeding if a safe state is guaranteed.",
          "Deadlock detection algorithms construct resource allocation graphs to detect directed cycles in multi-resource systems."
        ]
      }
    ]
  },
  {
    title: "Chapter 4: Distributed Systems, Consensus, and Fault Tolerance",
    startPage: 9,
    sections: [
      {
        pageNumber: 9,
        title: "4.1 Foundations of Distributed Computing",
        lines: [
          "Distributed systems consist of independent nodes that communicate over asynchronous networks without shared physical clock or memory.",
          "The CAP theorem states that a distributed datastore can guarantee at most two of Consistency, Availability, and Partition Tolerance.",
          "In network partitions, distributed databases must choose between returning stale data (Availability) or failing writes (Consistency).",
          "Lamport logical timestamps and Vector clocks establish a partial causal ordering of events across asynchronous nodes."
        ]
      },
      {
        pageNumber: 10,
        title: "4.2 Consensus via Raft Protocol",
        lines: [
          "Consensus algorithms ensure that a cluster of distributed nodes agree on a shared state machine log despite network failures.",
          "Raft decomposes consensus into three distinct subproblems: leader election, log replication, and safety guarantees.",
          "In Raft, when a follower node experiences an election timeout without receiving heartbeats, it transitions to Candidate state and votes for itself.",
          "A candidate becomes leader upon receiving votes from a majority quorum of nodes and subsequently broadcasts periodic append-entry heartbeats.",
          "Log entries are committed only when safely replicated across a quorum, guaranteeing linearizable state machine replication."
        ]
      },
      {
        pageNumber: 11,
        title: "4.3 Distributed Transactions and Commit Protocols",
        lines: [
          "Two-Phase Commit (2PC) guarantees distributed atomicity through an initial voting Prepare phase followed by a Commit or Abort phase.",
          "The coordinator node asks all participants to prepare; if all vote yes, the transaction commits globally.",
          "If the coordinator crashes after the prepare phase, participating cohort nodes can become blocked awaiting the outcome.",
          "Three-Phase Commit (3PC) eliminates blocking states by introducing a Pre-Commit phase with bounded timeouts."
        ]
      }
    ]
  },
  {
    title: "Chapter 5: File Systems, Storage, and Distributed Storage",
    startPage: 12,
    sections: [
      {
        pageNumber: 12,
        title: "5.1 Inodes and File System Layout",
        lines: [
          "File systems organize persistent block storage using metadata structures known as index nodes or inodes.",
          "An inode stores file permissions, ownership, timestamps, size, and pointers to data blocks on disk.",
          "Hard links point directly to an inode number, whereas symbolic links store the path string of the target file.",
          "Journaling file systems log pending write operations in a sequential journal before committing metadata to protect against power failure."
        ]
      },
      {
        pageNumber: 13,
        title: "5.2 Distributed Storage and LSM Trees",
        lines: [
          "Modern distributed key-value stores utilize Log-Structured Merge (LSM) trees to maximize sequential write throughput.",
          "Writes are first appended to an immutable write-ahead log (WAL) and stored in an in-memory sorted MemTable.",
          "When MemTables exceed memory thresholds, they are flushed sequentially to disk as Sorted String Tables (SSTables).",
          "Bloom filters provide rapid probabilistic membership checks to prevent expensive disk seeks for non-existent keys."
        ]
      }
    ]
  }
];

// Global books registry (singleton across Node.js request lifecycle)
const globalStore = globalThis.__bookMatcherStore || {
  books: new Map()
};
globalThis.__bookMatcherStore = globalStore;

export function initDefaultSampleBook() {
  const bookId = "sample-os-distributed-systems";
  if (globalStore.books.has(bookId)) {
    return globalStore.books.get(bookId);
  }

  const pages = [];
  const toc = [];

  // Title page
  pages.push({
    pageNumber: 1,
    title: "Title & Frontmatter",
    lines: [
      { lineNumber: 1, text: "OPERATING SYSTEMS & DISTRIBUTED SYSTEMS - 4th Edition" },
      { lineNumber: 2, text: "A Comprehensive Engineering Reference" },
      { lineNumber: 3, text: "Author: Prof. Marcus Sterling, MIT Computer Science Division" },
      { lineNumber: 4, text: "Copyright © 2026 Academic Press. All rights reserved." }
    ]
  });

  CHAPTERS.forEach(ch => {
    toc.push({ level: 1, title: ch.title, page: ch.startPage });
    ch.sections.forEach(sec => {
      toc.push({ level: 2, title: sec.title, page: sec.pageNumber });
      
      const pageLines = [];
      let lNum = 1;
      sec.lines.forEach((sentence) => {
        pageLines.push({
          lineNumber: lNum++,
          text: `Line ${lNum - 1}: ${sentence}`
        });
        pageLines.push({
          lineNumber: lNum++,
          text: `Detailed Analysis: In practical implementation, this ensures operational reliability and computational efficiency.`
        });
      });

      pages.push({
        pageNumber: sec.pageNumber,
        title: sec.title,
        lines: pageLines
      });
    });
  });

  const sampleBook = {
    id: bookId,
    title: "Principles of Operating Systems & Distributed Systems (4th Ed.)",
    totalPages: pages.length,
    toc,
    pages
  };

  globalStore.books.set(bookId, sampleBook);
  return sampleBook;
}

export function getBook(bookId) {
  initDefaultSampleBook();
  return globalStore.books.get(bookId) || null;
}

export function getAllBooks() {
  initDefaultSampleBook();
  return Array.from(globalStore.books.values()).map(b => ({
    id: b.id,
    title: b.title,
    totalPages: b.totalPages,
    toc: b.toc
  }));
}

export function saveBook(book) {
  globalStore.books.set(book.id, book);
}
