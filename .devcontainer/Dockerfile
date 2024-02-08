FROM mcr.microsoft.com/devcontainers/base:bullseye

# update packages
RUN apt update -y && apt install -y gpg sudo wget curl
# RUN install -dm 755 /etc/apt/keyrings
# RUN wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | sudo tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null
# RUN echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=arm64] https://mise.jdx.dev/deb stable main" | sudo tee /etc/apt/sources.list.d/mise.list
# RUN apt update && apt install -y mise

USER vscode

# install mise
RUN curl https://mise.run | sh

# setup mise shims
RUN echo 'eval "$(~/.local/bin/mise activate bash && mise install)"' >> ~/.bashrc

# install mise tools (.mise.teoml)
# RUN ~/.local/bin/mise install

CMD [ "bash" ]