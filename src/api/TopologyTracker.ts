// src/api/topologyTracker.ts
export interface TopologyData {
  sourcesVisited: number;
  activeRequests: number;
  totalLinksFound: number;
  depth: number;
}

export class TopologyTracker {
  private data: TopologyData = {
    sourcesVisited: 0,
    activeRequests: 0,
    totalLinksFound: 0,
    depth: 0
  };

  constructor(private onUpdate: (data: TopologyData) => void) {}

  public attach(stream: any) {
    // These event names ('metadata', 'request', etc.) depend on your 
    // specific Comunica/Engine implementation
    stream.on('metadata', (metadata: any) => {
      if (metadata.source) {
        this.data.sourcesVisited++;
        this.emit();
      }
    });

    // Custom engine events often emitted during traversal
    stream.on('requestTriggered', () => {
      this.data.activeRequests++;
      this.data.totalLinksFound++;
      this.emit();
    });

    stream.on('requestFinished', () => {
      this.data.activeRequests = Math.max(0, this.data.activeRequests - 1);
      this.emit();
    });
  }

  private emit() {
    // Send a shallow copy to trigger React state updates
    this.onUpdate({ ...this.data });
  }
}