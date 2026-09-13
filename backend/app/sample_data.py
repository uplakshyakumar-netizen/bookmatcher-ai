import os
from typing import Dict, Any, List, Optional
import pymupdf
from app.pdf_processor import process_and_index_pdf
from app.storage import get_book

SAMPLE_PDF_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "sample_textbook.pdf"
)

SAMPLE_NOTES = """# Lecture 4: Virtual Memory & Address Translation
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
"""

CHAPTERS = [
    {
        "title": "Chapter 1: Operating System Architectures & Kernel Models",
        "start_page": 1,
        "sections": [
            ("1.1 Kernel Modes and System Calls", [
                "Modern computer operating systems employ dual-mode hardware operation to separate user space from privileged kernel space.",
                "System calls serve as the programmatic interface between a running application and the underlying operating system services.",
                "When a program initiates a system call, the CPU transitions from user mode to supervisor mode via a software trap interrupt.",
                "Hardware timers prevent runaway processes by periodically generating interrupts to trigger context switching.",
                "Microkernels minimize kernel complexity by running device drivers and file systems as unprivileged user-space servers."
            ]),
            ("1.2 Process Scheduling and State Transitions", [
                "A process transitions through distinct operational states: New, Ready, Running, Waiting, and Terminated.",
                "The round-robin scheduling algorithm assigns a fixed time quantum to each ready process in a cyclic FIFO queue.",
                "Shortest Job First (SJF) scheduling optimizes average turnaround time but risks starvation for lengthy CPU-bound tasks.",
                "Priority inversion occurs when a low-priority thread holds a lock required by a high-priority thread without yielding."
            ])
        ]
    },
    {
        "title": "Chapter 2: Memory Management & Virtual Memory Systems",
        "start_page": 6,
        "sections": [
            ("2.1 Virtual Memory Fundamentals", [
                "Virtual memory provides each process with the illusion of an isolated, continuous address space while mapping to disparate physical frames.",
                "Address translation hardware within the Memory Management Unit (MMU) converts virtual addresses into physical addresses dynamically.",
                "Paging divides logical memory into uniform blocks called pages, and physical memory into corresponding page frames.",
                "Page tables maintain translation records known as Page Table Entries (PTE), containing frame addresses and protection flags."
            ]),
            ("2.2 TLB and Hardware Caching", [
                "The Translation Lookaside Buffer (TLB) is a high-speed hardware cache that stores recent virtual-to-physical address translations.",
                "A TLB hit enables the processor to resolve physical addresses in a single cycle without querying main memory page tables.",
                "A TLB miss forces an MMU page table walk across multi-level hierarchical tables, imposing significant latency penalties.",
                "Address Space Identifiers (ASID) tag TLB entries to eliminate the costly requirement of flushing the cache on each context switch."
            ]),
            ("2.3 Page Fault Handling and Demand Paging", [
                "A page fault exception occurs when a program attempts to access a memory address whose valid bit in the page table is zero.",
                "Demand paging avoids loading entire programs into RAM, fetching individual pages on demand only when referenced.",
                "When a page fault occurs, the OS traps into kernel mode, reads the missing page frame from secondary swap storage, and updates the PTE.",
                "Page replacement algorithms such as Least Recently Used (LRU) choose victim pages to evict when physical memory becomes exhausted.",
                "Thrashing describes the catastrophic performance degradation that occurs when an OS spends more time paging than executing code."
            ])
        ]
    },
    {
        "title": "Chapter 3: Concurrency, Locks, and Deadlock Avoidance",
        "start_page": 15,
        "sections": [
            ("3.1 Synchronization Primitives", [
                "Concurrent threads executing in shared memory require synchronization primitives to prevent non-deterministic race conditions.",
                "Mutex locks and counting semaphores enforce mutual exclusion around critical sections to prevent race conditions.",
                "Atomic test-and-set and compare-and-swap (CAS) hardware instructions allow lock-free synchronization algorithms.",
                "Condition variables allow threads to sleep efficiently until signaled that a specific shared state predicate has been fulfilled."
            ]),
            ("3.2 Deadlock Theory and Coffman Conditions", [
                "A deadlock occurs when a set of threads are permanently blocked, each waiting for a resource held by another in the set.",
                "Deadlock requires all four Coffman conditions: mutual exclusion, hold and wait, no preemption, and circular wait.",
                "Eliminating circular wait by enforcing a strict global resource acquisition ordering is the most common deadlock prevention strategy.",
                "The Banker's Algorithm prevents deadlocks by simulating resource allocation and only proceeding if a safe state is guaranteed.",
                "Deadlock detection algorithms construct resource allocation graphs to detect directed cycles in multi-resource systems."
            ])
        ]
    },
    {
        "title": "Chapter 4: Distributed Systems, Consensus, and Fault Tolerance",
        "start_page": 24,
        "sections": [
            ("4.1 Foundations of Distributed Computing", [
                "Distributed systems consist of independent nodes that communicate over asynchronous networks without shared physical clock or memory.",
                "The CAP theorem states that a distributed datastore can guarantee at most two of Consistency, Availability, and Partition Tolerance.",
                "In network partitions, distributed databases must choose between returning stale data (Availability) or failing writes (Consistency).",
                "Lamport logical timestamps and Vector clocks establish a partial causal ordering of events across asynchronous nodes."
            ]),
            ("4.2 Consensus via Raft Protocol", [
                "Consensus algorithms ensure that a cluster of distributed nodes agree on a shared state machine log despite network failures.",
                "Raft decomposes consensus into three distinct subproblems: leader election, log replication, and safety guarantees.",
                "In Raft, when a follower node experiences an election timeout without receiving heartbeats, it transitions to Candidate state and votes for itself.",
                "A candidate becomes leader upon receiving votes from a majority quorum of nodes and subsequently broadcasts periodic append-entry heartbeats.",
                "Log entries are committed only when safely replicated across a quorum, guaranteeing linearizable state machine replication."
            ]),
            ("4.3 Distributed Transactions and Commit Protocols", [
                "Two-Phase Commit (2PC) guarantees distributed atomicity through an initial voting Prepare phase followed by a Commit or Abort phase.",
                "The coordinator node asks all participants to prepare; if all vote yes, the transaction commits globally.",
                "If the coordinator crashes after the prepare phase, participating cohort nodes can become blocked awaiting the outcome.",
                "Three-Phase Commit (3PC) eliminates blocking states by introducing a Pre-Commit phase with bounded timeouts."
            ])
        ]
    },
    {
        "title": "Chapter 5: File Systems, Storage, and Distributed Storage",
        "start_page": 35,
        "sections": [
            ("5.1 Inodes and File System Layout", [
                "File systems organize persistent block storage using metadata structures known as index nodes or inodes.",
                "An inode stores file permissions, ownership, timestamps, size, and pointers to data blocks on disk.",
                "Hard links point directly to an inode number, whereas symbolic links store the path string of the target file.",
                "Journaling file systems log pending write operations in a sequential journal before committing metadata to protect against power failure."
            ]),
            ("5.2 Distributed Storage and LSM Trees", [
                "Modern distributed key-value stores utilize Log-Structured Merge (LSM) trees to maximize sequential write throughput.",
                "Writes are first appended to an immutable write-ahead log (WAL) and stored in an in-memory sorted MemTable.",
                "When MemTables exceed memory thresholds, they are flushed sequentially to disk as Sorted String Tables (SSTables).",
                "Bloom filters provide rapid probabilistic membership checks to prevent expensive disk seeks for non-existent keys."
            ])
        ]
    }
]

def generate_sample_textbook_pdf() -> str:
    """
    Generates a beautifully formatted sample textbook PDF.
    """
    os.makedirs(os.path.dirname(SAMPLE_PDF_PATH), exist_ok=True)
    if os.path.exists(SAMPLE_PDF_PATH):
        return SAMPLE_PDF_PATH
        
    doc = pymupdf.open()
    
    # Title Page
    title_page = doc.new_page(width=595, height=842) # A4
    title_page.insert_text(pymupdf.Point(60, 200), "OPERATING SYSTEMS & DISTRIBUTED SYSTEMS", fontsize=20, fontname="helv", color=(0.1, 0.2, 0.4))
    title_page.insert_text(pymupdf.Point(60, 240), "A Comprehensive Engineering Reference - 4th Edition", fontsize=13, fontname="helv", color=(0.3, 0.3, 0.3))
    title_page.insert_text(pymupdf.Point(60, 300), "Author: Prof. Marcus Sterling, MIT CS Division", fontsize=11, fontname="helv")
    title_page.insert_text(pymupdf.Point(60, 750), "Copyright © 2026 Academic Press. All rights reserved.", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
    
    toc_entries = []
    current_page_idx = 1
    
    for ch in CHAPTERS:
        toc_entries.append([1, ch["title"], current_page_idx + 1])
        
        for sec_title, sentences in ch["sections"]:
            toc_entries.append([2, sec_title, current_page_idx + 1])
            page = doc.new_page(width=595, height=842)
            current_page_idx += 1
            
            # Header
            page.insert_text(pymupdf.Point(50, 45), ch["title"][:45] + "...", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
            page.draw_line(pymupdf.Point(50, 52), pymupdf.Point(545, 52), color=(0.8, 0.8, 0.8), width=0.5)
            
            # Section Title
            page.insert_text(pymupdf.Point(50, 85), sec_title, fontsize=15, fontname="helv", color=(0.12, 0.23, 0.38))
            
            # Paragraphs / Lines
            y_pos = 120
            for idx, sentence in enumerate(sentences, 1):
                line_text = f"Line {idx}: {sentence}"
                page.insert_text(pymupdf.Point(50, y_pos), line_text, fontsize=10, fontname="helv", color=(0.15, 0.15, 0.15))
                y_pos += 24
                
                elaboration = "Detailed Analysis: In practical implementation, this ensures operational reliability and computational efficiency under heavy workloads."
                page.insert_text(pymupdf.Point(65, y_pos), elaboration, fontsize=8.5, fontname="helv", color=(0.35, 0.35, 0.35))
                y_pos += 28
                
            # Footer with page number
            page.draw_line(pymupdf.Point(50, 790), pymupdf.Point(545, 790), color=(0.8, 0.8, 0.8), width=0.5)
            page.insert_text(pymupdf.Point(280, 810), f"Page {current_page_idx}", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
            
    doc.set_toc(toc_entries)
    doc.save(SAMPLE_PDF_PATH)
    doc.close()
    return SAMPLE_PDF_PATH

def ensure_sample_book_loaded() -> Dict[str, Any]:
    """
    Ensures the sample textbook is generated and indexed in the database.
    """
    pdf_path = generate_sample_textbook_pdf()
    book_id = "sample-os-distributed-systems"
    
    existing = get_book(book_id)
    if existing:
        return {
            "book": existing,
            "sample_notes": SAMPLE_NOTES
        }
        
    indexed = process_and_index_pdf(
        pdf_path=pdf_path,
        book_id=book_id,
        title="Principles of Operating Systems & Distributed Systems (4th Ed.)"
    )
    book = get_book(book_id)
    return {
        "book": book,
        "sample_notes": SAMPLE_NOTES
    }
