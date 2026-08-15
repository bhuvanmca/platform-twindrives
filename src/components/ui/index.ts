// Barrel for the UI primitive layer. Import from "@/components/ui" so pages
// never reach for raw Tailwind palette classes to rebuild a control by hand.

export { Button, buttonVariants, type ButtonProps } from "./button";
export { Input, Textarea, fieldBase } from "./input";
export { Label, Field } from "./label";
export { Switch, Checkbox } from "./switch";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./select";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
export { Badge, StatusDot, badgeVariants } from "./badge";
export { Skeleton, TableSkeleton, CardsSkeleton } from "./skeleton";
export { Separator } from "./separator";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./table";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "./dialog";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./dropdown-menu";
export { Avatar, AvatarImage, AvatarFallback, initials } from "./avatar";
