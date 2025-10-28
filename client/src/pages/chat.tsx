import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Users, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SelectChatMessage } from "../../../db/schema";

const userSchema = z.object({
  username: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(30, "El nombre no puede tener más de 30 caracteres"),
  age: z.coerce.number().min(13, "Debes tener al menos 13 años").max(120, "Edad inválida"),
});

type UserData = z.infer<typeof userSchema>;

export default function Chat() {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<SelectChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const form = useForm<UserData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      age: 18,
    },
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("chat_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserData(user);
        setIsUserModalOpen(false);
      } catch (error) {
        console.error("Error loading saved user:", error);
        setIsUserModalOpen(true);
      }
    } else {
      setIsUserModalOpen(true);
    }
  }, []);

  const { data: initialMessages } = useQuery<SelectChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: !!userData,
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!userData) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setIsWsConnected(true);
      websocket.send(JSON.stringify({
        type: "join",
        username: userData.username,
        age: userData.age,
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "new_message") {
        setMessages((prev) => [...prev, data.message]);
      } else if (data.type === "user_count") {
        setOnlineCount(data.count);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al chat. Intenta recargar la página.",
        variant: "destructive",
      });
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsWsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [userData, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmitUser = (data: UserData) => {
    localStorage.setItem("chat_user", JSON.stringify(data));
    setUserData(data);
    setIsUserModalOpen(false);
    toast({
      title: "¡Bienvenido al chat!",
      description: `Hola ${data.username}, ya puedes chatear con otros usuarios.`,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_user");
    setUserData(null);
    setIsUserModalOpen(true);
    if (ws) {
      ws.close();
    }
    toast({
      title: "Sesión cerrada",
      description: "Has salido del chat.",
    });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !ws || !userData) return;

    if (ws.readyState !== WebSocket.OPEN) {
      toast({
        title: "Conectando...",
        description: "Por favor espera un momento mientras nos conectamos al chat.",
        variant: "destructive",
      });
      return;
    }

    ws.send(JSON.stringify({
      type: "message",
      username: userData.username,
      age: userData.age,
      message: newMessage.trim(),
    }));

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="bg-slate-900 border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-2xl text-cyan-300">Únete al Chat Global</DialogTitle>
            <DialogDescription className="text-slate-400">
              Para comenzar a chatear, ingresa tu nombre y edad
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-300">Nombre</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Tu nombre"
                        className="bg-slate-800 border-cyan-500/20 text-white"
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-300">Edad</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Tu edad"
                        className="bg-slate-800 border-cyan-500/20 text-white"
                        data-testid="input-age"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                data-testid="button-join-chat"
              >
                Unirse al Chat
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {userData && (
        <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
          <Card className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md border-cyan-500/20 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-cyan-500/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-cyan-300">Chat Global</h1>
                  <p className="text-sm text-slate-400">Chateando como {userData.username}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
                    <Users className="h-5 w-5 text-green-400" />
                    <span className="text-green-300 font-semibold" data-testid="text-online-count">
                      {onlineCount} online
                    </span>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:text-red-200"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cambiar Usuario
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, index) => {
                const isOwnMessage = msg.username === userData.username;
                const messageTime = new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id || index}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-cyan-500 text-black rounded-br-sm"
                          : "bg-slate-800 text-white rounded-bl-sm"
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-cyan-400 text-sm">
                            {msg.username}
                          </span>
                          <span className="text-xs text-slate-500">
                            {msg.age} años
                          </span>
                        </div>
                      )}
                      <p className="break-words">{msg.message}</p>
                      <span
                        className={`text-xs ${
                          isOwnMessage ? "text-black/60" : "text-slate-500"
                        } block text-right mt-1`}
                      >
                        {messageTime}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-cyan-500/20 p-4 bg-slate-900/80">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-slate-800 border-cyan-500/20 text-white placeholder:text-slate-500"
                  data-testid="input-message"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !isWsConnected}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black px-6 disabled:opacity-50"
                  data-testid="button-send-message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
