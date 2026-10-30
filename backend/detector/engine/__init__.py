"""
Model-agnostic analysis engine.

Every modality runs the same three stages:
  1. analyse   the model reads the content and the extracted facts and returns
               atomic claims, concrete observations and search queries (no verdict)
  2. retrieve  a tool gathers external evidence for each query (no model)
  3. verify    the model judges each claim against the evidence and the facts
               and returns the verdict

Retrieval sits outside the model, so any two backends see identical evidence
and a comparison between them isolates the model.
"""
