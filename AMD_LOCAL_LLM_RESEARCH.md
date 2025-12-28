# Local LLM Support for AMD GPUs on Linux

## Research Date: December 28, 2025
## Target Hardware: AMD GPU with 16GB VRAM (9060 XT reference)

---

## Executive Summary

AMD GPUs can run local LLMs on Linux, primarily through ROCm (AMD's compute platform) and various inference frameworks. With 16GB VRAM, you can run most 7B-13B parameter models and some quantized larger models.

**Note**: The AMD 9060 XT model number doesn't match current AMD naming conventions. This research covers AMD Radeon RX 6000 and 7000 series GPUs (RX 6900 XT, RX 7900 XT/XTX) which are the most likely candidates. If this is a newer model, the principles remain the same.

---

## 1. AMD ROCm Platform

### What is ROCm?
ROCm (Radeon Open Compute) is AMD's open-source compute platform for GPU computing, analogous to NVIDIA's CUDA.

### ROCm Support Status
- **Latest Version**: ROCm 6.x (as of late 2024/early 2025)
- **Supported GPUs**: 
  - RDNA 3 (RX 7900 XTX, 7900 XT, 7900 GRE)
  - RDNA 2 (RX 6900 XT, 6800 XT, 6800)
  - Some RDNA 1 and older GCN architectures (limited support)

### Installation
```bash
# Ubuntu/Debian-based systems
wget https://repo.radeon.com/amdgpu-install/latest/ubuntu/jammy/amdgpu-install_*_all.deb
sudo apt install ./amdgpu-install_*_all.deb
sudo amdgpu-install --usecase=rocm

# Verify installation
rocm-smi
rocminfo
```

---

## 2. LLM Inference Frameworks for AMD

### A. llama.cpp (Recommended - Best AMD Support)

**Pros:**
- Excellent ROCm/HIP support
- Efficient GGUF format
- Easy to use
- Active development

**Installation:**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make LLAMA_HIPBLAS=1  # Builds with AMD GPU support

# Or use pre-built binaries
```

**Usage Example:**
```bash
# Run a model
./main -m models/llama-2-7b.Q5_K_M.gguf \
       -p "Once upon a time" \
       -n 128 \
       --n-gpu-layers 35  # Offload layers to GPU
```

**16GB VRAM Recommendations:**
- 7B models: Full precision or Q8 quantization (all layers on GPU)
- 13B models: Q5_K_M or Q4_K_M quantization (all layers on GPU)
- 34B models: Q3_K_M or Q4_K_M (most layers on GPU)
- 70B models: Q2_K or Q3_K_S (partial offloading required)

### B. Text Generation Web UI (Oobabooga)

**Pros:**
- User-friendly interface
- Multiple backend support (llama.cpp, ExLlamaV2, Transformers)
- Easy model management

**Installation:**
```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
./start_linux.sh --chat
```

**AMD Support:**
- Works via llama.cpp backend
- Transformers backend with ROCm PyTorch
- ExLlamaV2 has experimental AMD support

### C. vLLM (Production-Grade Inference)

**Status**: ROCm support added in recent versions

**Installation:**
```bash
pip install vllm

# May require building from source for latest AMD support
git clone https://github.com/vllm-project/vllm.git
cd vllm
pip install -e .
```

**Usage:**
```python
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-2-7b-hf")
outputs = llm.generate("Hello, my name is", SamplingParams(temperature=0.8))
```

### D. Ollama

**Pros:**
- Extremely easy to use
- Model management built-in
- ROCm support

**Installation:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Usage:**
```bash
# Pull and run models
ollama run llama2:7b
ollama run mistral:7b
ollama run codellama:13b
```

### E. PyTorch with Transformers

**Installation:**
```bash
# Install ROCm-enabled PyTorch
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.7

# Install Transformers
pip install transformers accelerate bitsandbytes
```

**Usage:**
```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    device_map="auto",
    torch_dtype=torch.float16
)
```

---

## 3. Model Recommendations for 16GB VRAM

### Fully Loaded (No CPU Offloading)

| Model | Size | Quantization | Use Case |
|-------|------|--------------|----------|
| Llama 2 | 7B | Q8 or FP16 | General purpose |
| Mistral | 7B | Q8 or FP16 | Instruction following |
| Mixtral | 8x7B | Q3_K_M | MoE, good performance |
| Code Llama | 13B | Q5_K_M | Code generation |
| Llama 2 | 13B | Q5_K_M | General purpose |
| Yi | 34B | Q3_K_M | High quality, partial offload |

### With Partial CPU Offloading

| Model | Size | Quantization |
|-------|------|--------------|
| Llama 2 | 70B | Q2_K |
| Mixtral | 8x7B | Q4_K_M |
| Yi | 34B | Q4_K_M |

---

## 4. Performance Optimization Tips

### ROCm Environment Variables
```bash
export ROCM_PATH=/opt/rocm
export HSA_OVERRIDE_GFX_VERSION=10.3.0  # May need adjustment per GPU
export HIP_VISIBLE_DEVICES=0
export GPU_MAX_HW_QUEUES=4
```

### Kernel Tuning
```bash
# Add to /etc/sysctl.conf
vm.max_map_count=2147483642
```

### Temperature and Power Management
```bash
# Monitor GPU
watch -n 1 rocm-smi

# Set power limit (example: 250W)
sudo rocm-smi --setpoweroverdrive 250

# Set fan speed
sudo rocm-smi --setfan 50  # 50% fan speed
```

---

## 5. Common Issues and Solutions

### Issue: "No HIP-capable device found"
**Solution:**
```bash
# Check GPU visibility
rocm-smi
ls -la /dev/kfd /dev/dri/render*

# Add user to video/render groups
sudo usermod -a -G video,render $USER
# Logout and login again
```

### Issue: Out of Memory Errors
**Solutions:**
1. Use more aggressive quantization (Q4_K_M instead of Q5_K_M)
2. Reduce context length: `--ctx-size 2048`
3. Offload fewer layers to GPU: `--n-gpu-layers 25`
4. Enable CPU offloading

### Issue: Slow Performance
**Solutions:**
1. Verify GPU usage: `rocm-smi` should show activity
2. Check if using GPU: Look for "Using HIP" in startup logs
3. Update to latest ROCm version
4. Try different batch sizes: `--batch-size 512`

### Issue: Build Errors
**Solution:**
```bash
# Ensure ROCm is in PATH
export PATH=$PATH:/opt/rocm/bin
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/rocm/lib

# Install development packages
sudo apt install rocm-dev hip-dev
```

---

## 6. Benchmark Expectations (16GB VRAM)

### Approximate Inference Speed (tokens/second)

| Model | Quantization | Speed (t/s) | Notes |
|-------|--------------|-------------|-------|
| 7B | Q5_K_M | 40-60 | Full GPU |
| 13B | Q5_K_M | 25-35 | Full GPU |
| 34B | Q4_K_M | 10-20 | Mixed GPU/CPU |
| 70B | Q2_K | 5-10 | Heavy CPU offload |

*Speeds vary based on specific AMD GPU model, ROCm version, and context length*

---

## 7. Alternative: Docker with ROCm

### Using Official ROCm Containers
```bash
# Pull ROCm container
docker pull rocm/pytorch:latest

# Run with GPU access
docker run -it --device=/dev/kfd --device=/dev/dri \
           --group-add video --group-add render \
           rocm/pytorch:latest
```

### Advantages
- Isolated environment
- Pre-configured ROCm
- Easy version management

---

## 8. Comparison: AMD vs NVIDIA for LLM Inference

### AMD Advantages
- ✅ Open-source ROCm platform
- ✅ Generally better price/performance
- ✅ Good VRAM capacity in mid-range cards
- ✅ Improving software ecosystem

### AMD Disadvantages
- ❌ Less mature software support than CUDA
- ❌ Fewer pre-built binaries
- ❌ Some frameworks have NVIDIA-first development
- ❌ Potential compatibility issues with bleeding-edge models

### Verdict for Local LLM Use
AMD GPUs with 16GB VRAM are **viable and cost-effective** for local LLM inference, especially with:
- llama.cpp (excellent AMD support)
- Ollama (easy to use)
- ROCm PyTorch (widely supported)

---

## 9. Recommended Setup Path

### Step 1: Install ROCm
```bash
sudo amdgpu-install --usecase=rocm
sudo usermod -a -G video,render $USER
# Reboot
```

### Step 2: Verify Installation
```bash
rocm-smi
rocminfo | grep "Name:"
```

### Step 3: Start with Ollama (Easiest)
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama run llama2:7b
```

### Step 4: Try llama.cpp (More Control)
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make LLAMA_HIPBLAS=1

# Download a model from Hugging Face
# Example: https://huggingface.co/TheBloke
```

### Step 5: Advanced - Text Generation Web UI
```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
./start_linux.sh
```

---

## 10. Resources and Links

### Official Documentation
- ROCm Documentation: https://rocm.docs.amd.com/
- ROCm GitHub: https://github.com/RadeonOpenCompute/ROCm

### LLM Frameworks
- llama.cpp: https://github.com/ggerganov/llama.cpp
- Ollama: https://ollama.com/
- Text Gen Web UI: https://github.com/oobabooga/text-generation-webui
- vLLM: https://github.com/vllm-project/vllm

### Model Sources
- Hugging Face: https://huggingface.co/models
- TheBloke (GGUF models): https://huggingface.co/TheBloke

### Community
- r/LocalLLaMA: Reddit community for local LLM enthusiasts
- ROCm Issues: https://github.com/RadeonOpenCompute/ROCm/issues

---

## 11. Quick Start Script

Save this as `setup_amd_llm.sh`:

```bash
#!/bin/bash
set -e

echo "=== AMD GPU Local LLM Setup Script ==="

# Check for AMD GPU
if ! command -v rocm-smi &> /dev/null; then
    echo "Installing ROCm..."
    wget https://repo.radeon.com/amdgpu-install/latest/ubuntu/jammy/amdgpu-install_*_all.deb
    sudo apt install ./amdgpu-install_*_all.deb
    sudo amdgpu-install --usecase=rocm -y
    sudo usermod -a -G video,render $USER
    echo "ROCm installed. Please reboot and run this script again."
    exit 0
fi

# Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Install llama.cpp
if [ ! -d "$HOME/llama.cpp" ]; then
    echo "Installing llama.cpp..."
    cd $HOME
    git clone https://github.com/ggerganov/llama.cpp
    cd llama.cpp
    make LLAMA_HIPBLAS=1
fi

echo "=== Setup Complete ==="
echo ""
echo "Test with: ollama run llama2:7b"
echo "Or use llama.cpp: cd ~/llama.cpp && ./main -m <model.gguf>"
```

---

## Conclusion

AMD GPUs with 16GB VRAM are well-suited for running local LLMs on Linux. The ROCm ecosystem has matured significantly, and frameworks like llama.cpp and Ollama provide excellent AMD support. 

**Recommended starting point**: Install ROCm and Ollama for the smoothest experience.

**Best performance**: llama.cpp with GGUF quantized models, offloading all layers to GPU.

**Model sweet spot**: 7B-13B parameter models with Q5 or Q4 quantization for best balance of quality and speed.
