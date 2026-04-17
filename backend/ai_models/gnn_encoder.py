from __future__ import annotations

import torch
from torch import Tensor, nn

try:
    from torch_geometric.nn import GCNConv, global_mean_pool
except Exception as exc:  # pragma: no cover
    GCNConv = None
    global_mean_pool = None
    _PYG_IMPORT_ERROR = exc
else:
    _PYG_IMPORT_ERROR = None


class SNPGraphEncoder(nn.Module):
    """Graph encoder for SNP markers using PyTorch Geometric.

    Nodes represent SNP loci and edges represent biological interactions.
    """

    def __init__(self, node_feature_dim: int, hidden_dim: int = 128, out_dim: int = 256, dropout: float = 0.2) -> None:
        super().__init__()
        if GCNConv is None or global_mean_pool is None:
            raise ImportError(
                "torch-geometric is required for SNPGraphEncoder. Install 'torch-geometric'."
            ) from _PYG_IMPORT_ERROR

        self.conv1 = GCNConv(node_feature_dim, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, hidden_dim)
        self.conv3 = GCNConv(hidden_dim, out_dim)
        self.dropout = nn.Dropout(dropout)
        self.act = nn.ReLU(inplace=True)

    def forward(self, x: Tensor, edge_index: Tensor, batch_index: Tensor) -> Tensor:
        """Encode batched SNP graphs.

        Args:
            x: Node features shape (num_nodes_total, node_feature_dim).
            edge_index: Graph edges shape (2, num_edges_total).
            batch_index: Batch assignment per node shape (num_nodes_total,).

        Returns:
            Graph embeddings shape (batch_size, out_dim).
        """
        x = self.conv1(x, edge_index)
        x = self.act(x)
        x = self.dropout(x)

        x = self.conv2(x, edge_index)
        x = self.act(x)
        x = self.dropout(x)

        x = self.conv3(x, edge_index)
        x = self.act(x)
        x = self.dropout(x)

        return global_mean_pool(x, batch_index)


__all__: list[str] = ["SNPGraphEncoder"]
